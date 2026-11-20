import json
import logging
import os
import re
from typing import Optional, Dict, Any
from app.config import settings
from app.agents.models import DEFAULT_GEMINI_MODEL, DEFAULT_OPENAI_MODEL, DEFAULT_CLAUDE_MODEL, FAST_GEMINI_MODEL, current_model
from app.agents.llm_context import current_llm_credentials, ai_seconds_left

logger = logging.getLogger(__name__)


class LLMProviderError(Exception):
    """Base exception for all LLM provider errors with structured codes."""
    def __init__(self, code: str, message: str, provider: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.provider = provider

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": self.code,
            "message": self.message,
            "detail": self.message,
            "provider": self.provider
        }


class AINotConnectedError(LLMProviderError):
    """Raised when an AI operation is requested without an active or configured API key."""
    def __init__(self, message: str = "Conecta una clave de API para obtener esta evaluación con IA.", provider: Optional[str] = None):
        super().__init__(code="ai_not_connected", message=message, provider=provider)


class AIRestingError(LLMProviderError):
    """La IA gratuita de Oportia agotó su cupo (de la persona, del día o de Google)."""
    def __init__(self, message: str, provider: Optional[str] = "gemini"):
        super().__init__(code="ai_resting", message=message, provider=provider)


class SharedAIConsentRequired(AINotConnectedError):
    """Hay IA gratuita disponible, pero la persona aún no aceptó el aviso de privacidad."""
    def __init__(self):
        LLMProviderError.__init__(
            self,
            code="shared_ai_consent_required",
            message=(
                "Para usar la IA gratuita de Oportia, acepta primero el aviso de privacidad en Ajustes, "
                "o conecta tu propia clave de IA."
            ),
            provider="gemini",
        )


# Errores que NO deben convertirse en una respuesta de respaldo silenciosa: la persona debe
# ver que falta su clave/consentimiento o que la IA gratuita está descansando.
USER_FACING_LLM_ERRORS = (AINotConnectedError, AIRestingError)



# Google rechaza (400 INVALID_ARGUMENT) los plazos menores a 10 s: antes se pedían 7–8 s cuando quedaba poco
# tiempo y la consulta fallaba al instante. Se deja 3 s de margen para responder a la app.
GEMINI_MIN_DEADLINE_SECONDS = 10
GEMINI_MAX_DEADLINE_SECONDS = 40
RESPONSE_MARGIN_SECONDS = 3
# Si hay modelo de respaldo, el principal no puede usar todo el tiempo: se reserva lo mínimo para el respaldo.
FALLBACK_RESERVE_SECONDS = GEMINI_MIN_DEADLINE_SECONDS + RESPONSE_MARGIN_SECONDS


def gemini_models_to_try(requested: Optional[str]) -> list:
    """1.6.5 (DT-15): modelo pedido (si sigue vigente), el por omisión y el rápido; sin modelos retirados."""
    out = []
    for m in (current_model("gemini", requested), DEFAULT_GEMINI_MODEL, FAST_GEMINI_MODEL):
        if m not in out:
            out.append(m)
    return out


def gemini_timeout_seconds(left: float, has_fallback: bool) -> Optional[float]:
    """Plazo para una consulta, o None si ya no alcanza el mínimo de Google."""
    usable = left - RESPONSE_MARGIN_SECONDS
    if usable < GEMINI_MIN_DEADLINE_SECONDS:
        return None
    if has_fallback and usable - FALLBACK_RESERVE_SECONDS >= GEMINI_MIN_DEADLINE_SECONDS:
        usable -= FALLBACK_RESERVE_SECONDS
    return float(min(usable, GEMINI_MAX_DEADLINE_SECONDS))


def classify_gemini_error(err: str) -> str:
    """invalid_key | quota | timeout | not_found | unavailable | other (DT-14: así se leen los registros)."""
    low = err.lower()
    if "401" in err or "403" in err or "api_key_invalid" in low or "invalid api key" in low:
        return "invalid_key"
    if "429" in err or "resource_exhausted" in low or "quota" in low:
        return "quota"
    if "deadline" in low or "timeout" in low or "timed out" in low or "504" in err:
        return "timeout"
    if "404" in err or "not_found" in low:
        return "not_found"
    if "503" in err or "unavailable" in low or "high demand" in low or "500" in err:
        return "unavailable"
    return "other"



def _drop_nulls(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _drop_nulls(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [_drop_nulls(v) for v in value if v is not None]
    return value


def normalize_llm_json(data: Any) -> Any:
    """
    1.6.5: los modelos Gemini 3.x devuelven `null` en los campos vacíos ("new_insights": null). El código
    hace `for x in res.get("new_insights", [])` y fallaba con TypeError: Opi respondía con un texto fijo
    aunque la IA había contestado bien. Se quitan los null, así aplica el valor por omisión de cada .get.
    Las listas se mantienen (ordenar ofertas y cargos sugeridos aceptan una lista).
    """
    return _drop_nulls(data)



# 1.6.7: Gemini 3.x "piensa" antes de responder (3.6 Flash, nivel medio por omisión): un mensaje corto a Opi
# tardaba 31–35 s en producción. Se pide un nivel bajo. Si el SDK o Google no aceptan el campo, se repite la
# misma consulta sin él y no se vuelve a enviar (la IA nunca queda caída por esta optimización).
# GEMINI_THINKING_LEVEL en Vercel permite cambiar el nivel ("minimal", "low", "medium", "high") o
# desactivarlo ("off").
_thinking_state = {"supported": True}


def gemini_thinking_level() -> str:
    level = (os.getenv("GEMINI_THINKING_LEVEL") or "low").strip().lower()
    return "" if level in ("", "off", "none", "default") else level


def generate_with_thinking(client, model: str, prompt: str, config: Dict[str, Any]):
    level = gemini_thinking_level()
    if not level or not _thinking_state["supported"]:
        return client.models.generate_content(model=model, contents=prompt, config=config)
    try:
        return client.models.generate_content(
            model=model, contents=prompt, config={**config, "thinking_config": {"thinking_level": level}}
        )
    except Exception as e:
        msg = str(e).lower()
        if "thinking" not in msg:
            raise
        _thinking_state["supported"] = False
        logger.warning(f"Gemini no aceptó thinking_level={level!r}; se sigue sin él: {str(e)[:200]}")
        return client.models.generate_content(model=model, contents=prompt, config=config)


class UnifiedLLMProvider:
    def __init__(self):
        self._gemini_client = None
        self._init_clients()

    def _init_clients(self):
        # Initialize Google GenAI client if key is present in environment or settings
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        if api_key:
            try:
                from google import genai
                self._gemini_client = genai.Client(api_key=api_key)
                logger.info("Google GenAI client initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai client: {e}")
                self._gemini_client = None

    def update_keys(self, provider: str, api_key: str, model_name: Optional[str] = None):
        if provider == "gemini":
            settings.GEMINI_API_KEY = api_key
            if model_name:
                settings.GEMINI_MODEL = model_name
            os.environ["GEMINI_API_KEY"] = api_key
            self._init_clients()
        elif provider == "openai":
            settings.OPENAI_API_KEY = api_key
            if model_name:
                settings.OPENAI_MODEL = model_name
        elif provider == "claude":
            settings.ANTHROPIC_API_KEY = api_key
            if model_name:
                settings.CLAUDE_MODEL = model_name
        settings.DEFAULT_PROVIDER = provider

    def reset_provider(self):
        """Wipes active API clients and memory instances."""
        self._gemini_client = None
        settings.purge_keys()

    @property
    def is_available(self) -> bool:
        """Returns True if an API key is actively available from the request context or settings."""
        creds = current_llm_credentials.get()
        if creds and creds.api_key:
            return True
        return bool(
            settings.GEMINI_API_KEY or
            settings.OPENAI_API_KEY or
            settings.ANTHROPIC_API_KEY or
            os.environ.get("GEMINI_API_KEY") or
            os.environ.get("OPENAI_API_KEY") or
            os.environ.get("ANTHROPIC_API_KEY")
        )

    def _shared_gemini_key(self) -> str:
        """
        Clave del servidor (IA gratuita de Oportia). Exige consentimiento y descuenta cupo.
        Devuelve "" si no hay IA gratuita configurada.
        """
        from app.agents import shared_ai
        key = shared_ai.shared_key()
        if not key:
            return ""
        req = shared_ai.current_shared_ai_request.get()
        if req is not None and not req.consent:
            raise SharedAIConsentRequired()
        # DT-17: si Google viene fallando, se avisa al instante y sin descontar cupo.
        if shared_ai.breaker.is_open():
            raise AIRestingError(shared_ai.BUSY_MESSAGE)
        shared_ai.charge_current_request()
        return key

    def generate_text(self, prompt: str, system_instruction: Optional[str] = None, provider: Optional[str] = None) -> str:
        """
        Toda consulta a la IA pasa por aquí. Antes de enviarla, el nombre, correo, teléfono y enlaces de la persona
        (y cualquier RUT) se reemplazan por marcadores; en la respuesta se vuelven a poner. Ver app/privacy/context.py.
        """
        from app.privacy.context import protected_pair, restore
        safe_prompt, safe_system = protected_pair(prompt, system_instruction)
        return restore(self._generate_text_raw(safe_prompt, safe_system, provider))

    def _generate_text_raw(self, prompt: str, system_instruction: Optional[str] = None, provider: Optional[str] = None) -> str:
        creds = current_llm_credentials.get()
        # Sin clave propia, la única IA del servidor es la gratuita de Oportia (Gemini).
        prov = (creds.provider if creds else "gemini").lower()
        using_shared = False

        # 1. Google Gemini
        if prov == "gemini":
            if creds:
                api_key = creds.api_key
            else:
                api_key = self._shared_gemini_key()
                using_shared = bool(api_key)
            if not api_key:
                raise AINotConnectedError(
                    message="Conecta una clave de API de Gemini en Ajustes para obtener esta función con IA.",
                    provider="gemini"
                )

            import time
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning(f"Failed to create ephemeral genai client: {e}")
                client = self._gemini_client

            if not client:
                raise LLMProviderError(
                    code="client_initialization_failed",
                    message="No se pudo inicializar el cliente de Google Gemini.",
                    provider="gemini"
                )

            requested = (creds.model_name if creds and creds.model_name else None) or settings.GEMINI_MODEL
            models_to_try = gemini_models_to_try(requested)

            def shared_failed() -> None:
                """La falla fue de Google: se devuelve el cupo y cuenta para el cortacircuitos (DT-17)."""
                if using_shared:
                    from app.agents import shared_ai
                    shared_ai.refund_current_request()
                    shared_ai.breaker.record_failure()

            last_err = None
            for index, candidate_model in enumerate(models_to_try):
                has_fallback = index < len(models_to_try) - 1
                left = ai_seconds_left()
                timeout_s = gemini_timeout_seconds(left, has_fallback)
                if timeout_s is None:
                    # Sin tiempo para otra consulta (Google exige al menos 10 s): se responde ya.
                    shared_failed()
                    raise LLMProviderError(code="timeout", message="La IA tardó demasiado en responder. Intenta nuevamente.", provider="gemini")
                try:
                    config = {"http_options": {"timeout": int(timeout_s * 1000)}}
                    if system_instruction:
                        config["system_instruction"] = system_instruction
                    started = time.monotonic()
                    response = generate_with_thinking(client, candidate_model, prompt, config)
                    if response and response.text:
                        # Medición de latencia (DT de la 1.6.7): sin contenido, solo modelo, tiempo y nivel.
                        logger.info(
                            f"Gemini {candidate_model} respondió en {time.monotonic() - started:.1f} s "
                            f"(thinking={gemini_thinking_level() if _thinking_state['supported'] else 'sin soporte'})"
                        )
                        if using_shared:
                            from app.agents import shared_ai
                            shared_ai.breaker.record_success()
                        return response.text
                except Exception as e:
                    last_err = e
                    err_str = str(e)
                    kind = classify_gemini_error(err_str)
                    logger.warning(f"Error calling Gemini model '{candidate_model}' ({kind}): {err_str[:300]}")

                    if kind == "invalid_key":
                        if using_shared:
                            # La clave del servidor falló: no es culpa de la persona.
                            logger.error("La clave GEMINI_API_KEY del servidor (IA gratuita) fue rechazada por Google.")
                            from app.agents.shared_ai import RESTING_MESSAGE
                            shared_failed()
                            raise AIRestingError(RESTING_MESSAGE)
                        raise LLMProviderError(
                            code="invalid_key",
                            message="La clave de API de Gemini ingresada es inválida o fue revocada. Revisa la clave en Ajustes.",
                            provider="gemini"
                        )

                    if kind == "quota":
                        # Sin cuota: probar otro modelo solo consume tiempo (DT-15).
                        if using_shared:
                            from app.agents.shared_ai import RESTING_MESSAGE
                            shared_failed()
                            raise AIRestingError(RESTING_MESSAGE)
                        raise LLMProviderError(
                            code="quota_exceeded",
                            message="Has alcanzado el límite de cuota o velocidad de Google Gemini. Espera unos momentos o selecciona otro modelo en Ajustes.",
                            provider="gemini"
                        )

                    if kind == "timeout":
                        # El modelo principal no alcanzó: se intenta con el rápido si queda tiempo.
                        if has_fallback and gemini_timeout_seconds(ai_seconds_left(), False) is not None:
                            continue
                        shared_failed()
                        raise LLMProviderError(
                            code="timeout",
                            message="Tiempo de espera agotado al conectar con Google Gemini. Intenta nuevamente.",
                            provider="gemini"
                        )

                    if kind == "unavailable" and ai_seconds_left() > 15:
                        time.sleep(1.0)
                    # not_found (modelo retirado) y otros errores: siguiente modelo de la cadena.

            # Todos los modelos de la cadena fallaron.
            shared_failed()
            raise LLMProviderError(
                code="service_unavailable",
                message=f"No se pudo completar la llamada con Google Gemini: {last_err}",
                provider="gemini"
            )

        # 2. OpenAI
        elif prov == "openai":
            api_key = (creds.api_key if creds else (settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")))
            if not api_key:
                raise AINotConnectedError(
                    message="Conecta una clave de API de OpenAI en Ajustes para obtener esta función con IA.",
                    provider="openai"
                )

            try:
                import httpx
                model = current_model("openai", (creds.model_name if creds and creds.model_name else None) or settings.OPENAI_MODEL)
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                resp = httpx.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.3
                    },
                    timeout=max(5.0, min(40.0, ai_seconds_left() - 3)),
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"]
                elif resp.status_code in (401, 403):
                    raise LLMProviderError(
                        code="invalid_key",
                        message="La clave de API de OpenAI no es válida o no tiene permisos. Revisa la clave en Ajustes.",
                        provider="openai"
                    )
                elif resp.status_code == 429:
                    raise LLMProviderError(
                        code="quota_exceeded",
                        message="Has alcanzado el límite de cuota o velocidad de OpenAI. Espera unos momentos o revisa tu facturación.",
                        provider="openai"
                    )
                elif resp.status_code >= 500:
                    raise LLMProviderError(
                        code="service_unavailable",
                        message="El servicio de OpenAI no está disponible en este momento. Intenta nuevamente más tarde.",
                        provider="openai"
                    )
                else:
                    raise LLMProviderError(
                        code="provider_error",
                        message=f"Error en OpenAI ({resp.status_code}): {resp.text[:150]}",
                        provider="openai"
                    )
            except httpx.TimeoutException:
                raise LLMProviderError(
                    code="timeout",
                    message="Tiempo de espera agotado al conectar con OpenAI (timeout). Intenta nuevamente.",
                    provider="openai"
                )
            except LLMProviderError:
                raise
            except Exception as e:
                raise LLMProviderError(
                    code="provider_error",
                    message=f"Error al conectar con OpenAI: {e}",
                    provider="openai"
                )

        # 3. Anthropic Claude
        elif prov == "claude":
            api_key = (creds.api_key if creds else (settings.ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY", "")))
            if not api_key:
                raise AINotConnectedError(
                    message="Conecta una clave de API de Claude en Ajustes para obtener esta función con IA.",
                    provider="claude"
                )

            try:
                import httpx
                model = current_model("claude", (creds.model_name if creds and creds.model_name else None) or settings.CLAUDE_MODEL)
                headers = {
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model,
                    "max_tokens": 4096,
                    "messages": [{"role": "user", "content": prompt}]
                }
                if system_instruction:
                    payload["system"] = system_instruction
                resp = httpx.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=payload,
                    timeout=max(5.0, min(40.0, ai_seconds_left() - 3)),
                )
                if resp.status_code == 200:
                    return resp.json()["content"][0]["text"]
                elif resp.status_code in (401, 403):
                    raise LLMProviderError(
                        code="invalid_key",
                        message="La clave de API de Anthropic Claude no es válida. Revisa la clave en Ajustes.",
                        provider="claude"
                    )
                elif resp.status_code == 429:
                    raise LLMProviderError(
                        code="quota_exceeded",
                        message="Has alcanzado el límite de cuota o velocidad de Anthropic Claude.",
                        provider="claude"
                    )
                elif resp.status_code >= 500:
                    raise LLMProviderError(
                        code="service_unavailable",
                        message="El servicio de Anthropic Claude no está disponible en este momento.",
                        provider="claude"
                    )
                else:
                    raise LLMProviderError(
                        code="provider_error",
                        message=f"Error en Claude ({resp.status_code}): {resp.text[:150]}",
                        provider="claude"
                    )
            except httpx.TimeoutException:
                raise LLMProviderError(
                    code="timeout",
                    message="Tiempo de espera agotado al conectar con Claude (timeout). Intenta nuevamente.",
                    provider="claude"
                )
            except LLMProviderError:
                raise
            except Exception as e:
                raise LLMProviderError(
                    code="provider_error",
                    message=f"Error al conectar con Claude: {e}",
                    provider="claude"
                )

        else:
            raise AINotConnectedError(
                message=f"Proveedor de IA no reconocido o no configurado ('{prov}').",
                provider=prov
            )

    def generate_json(self, prompt: str, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        enhanced_prompt = f"{prompt}\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido, sin bloques de código markdown ni texto adicional."
        raw_text = self.generate_text(enhanced_prompt, system_instruction=system_instruction)

        # Clean potential markdown fences
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return normalize_llm_json(json.loads(cleaned))
        except Exception:
            # Try to find JSON substring
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    return normalize_llm_json(json.loads(cleaned[start:end+1]))
                except Exception:
                    pass
            # Sin el contenido: la respuesta puede traer datos del CV y los registros no deben guardarlos.
            logger.warning(f"Could not parse JSON from LLM (largo {len(raw_text)} caracteres).")
            raise LLMProviderError(
                code="invalid_json",
                message="El modelo de IA devolvió una respuesta que no pudo ser interpretada como JSON."
            )


llm = UnifiedLLMProvider()
