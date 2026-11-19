import json
import logging
import os
import re
from typing import Optional, Dict, Any
from app.config import settings
from app.agents.models import DEFAULT_GEMINI_MODEL, DEFAULT_OPENAI_MODEL, DEFAULT_CLAUDE_MODEL
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

            primary_model = (creds.model_name if creds and creds.model_name else None) or settings.GEMINI_MODEL or DEFAULT_GEMINI_MODEL

            # Resilience chain with active models
            models_to_try = [primary_model]
            for candidate in [DEFAULT_GEMINI_MODEL, "gemini-1.5-flash", "gemini-2.5-flash", "gemini-3.5-flash"]:
                if candidate not in models_to_try:
                    models_to_try.append(candidate)

            last_err = None
            for candidate_model in models_to_try:
                # Sin tiempo suficiente para otra consulta: se responde ya (la app usa el respaldo sin IA).
                left = ai_seconds_left()
                if left < 6:
                    if using_shared:
                        from app.agents.shared_ai import refund_current_request
                        refund_current_request()
                    raise LLMProviderError(code="timeout", message="La IA tardó demasiado en responder. Intenta nuevamente.", provider="gemini")
                try:
                    contents = prompt
                    config = {"http_options": {"timeout": int(min(left - 3, 40) * 1000)}}
                    if system_instruction:
                        config["system_instruction"] = system_instruction

                    response = client.models.generate_content(
                        model=candidate_model,
                        contents=contents,
                        config=config
                    )
                    if response and response.text:
                        return response.text
                except Exception as e:
                    last_err = e
                    err_str = str(e)
                    logger.warning(f"Error calling Gemini model '{candidate_model}': {err_str}")

                    # Immediate key validation failure
                    if "401" in err_str or "403" in err_str or "API_KEY_INVALID" in err_str or "invalid api key" in err_str.lower():
                        if using_shared:
                            # La clave del servidor falló: no es culpa de la persona.
                            logger.error("La clave GEMINI_API_KEY del servidor (IA gratuita) fue rechazada por Google.")
                            from app.agents.shared_ai import RESTING_MESSAGE, refund_current_request
                            refund_current_request()  # la falla fue de Google, no se cobra a la persona
                            raise AIRestingError(RESTING_MESSAGE)
                        raise LLMProviderError(
                            code="invalid_key",
                            message="La clave de API de Gemini ingresada es inválida o fue revocada. Revisa la clave en Ajustes.",
                            provider="gemini"
                        )

                    # Quota exhaustion failure
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                        if using_shared:
                            from app.agents.shared_ai import RESTING_MESSAGE, refund_current_request
                            refund_current_request()  # la falla fue de Google, no se cobra a la persona
                            raise AIRestingError(RESTING_MESSAGE)
                        raise LLMProviderError(
                            code="quota_exceeded",
                            message="Has alcanzado el límite de cuota o velocidad de Google Gemini. Espera unos momentos o selecciona otro modelo en Ajustes.",
                            provider="gemini"
                        )

                    # Timeout / Deadline
                    if "timeout" in err_str.lower() or "deadline" in err_str.lower():
                        raise LLMProviderError(
                            code="timeout",
                            message="Tiempo de espera agotado al conectar con Google Gemini. Intenta nuevamente.",
                            provider="gemini"
                        )

                    # Backoff on 503 unavailable
                    if "503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str:
                        if ai_seconds_left() > 10:
                            time.sleep(1.0)

            # All models failed in fallback chain
            if using_shared:
                from app.agents.shared_ai import refund_current_request
                refund_current_request()
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
                model = (creds.model_name if creds and creds.model_name else None) or settings.OPENAI_MODEL or DEFAULT_OPENAI_MODEL
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
                model = (creds.model_name if creds and creds.model_name else None) or settings.CLAUDE_MODEL or DEFAULT_CLAUDE_MODEL
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
            return json.loads(cleaned)
        except Exception:
            # Try to find JSON substring
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    return json.loads(cleaned[start:end+1])
                except Exception:
                    pass
            # Sin el contenido: la respuesta puede traer datos del CV y los registros no deben guardarlos.
            logger.warning(f"Could not parse JSON from LLM (largo {len(raw_text)} caracteres).")
            raise LLMProviderError(
                code="invalid_json",
                message="El modelo de IA devolvió una respuesta que no pudo ser interpretada como JSON."
            )


llm = UnifiedLLMProvider()
