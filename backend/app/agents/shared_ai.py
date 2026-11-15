"""
IA gratuita de Oportia: clave de Gemini del servidor con cupo diario.

Reglas:
- Si la persona envía su propia clave (X-LLM-Key), se usa esa, sin cupo.
- Si no, y el servidor tiene GEMINI_API_KEY, se puede usar la "IA gratuita de Oportia",
  pero SOLO si la persona aceptó el aviso (cabecera X-Oportia-Shared-AI-Consent: 1).
  La clave usa el plan gratuito de la API de Gemini, en el que Google puede usar el
  contenido enviado para mejorar sus productos; por eso el consentimiento es obligatorio.
- Cada petición que use IA descuenta 1 consulta (aunque internamente haga varias llamadas),
  con un cupo por persona (ID anónimo del navegador), otro por IP y uno total diario.
- Si se agota cualquier cupo, o Google responde que no hay cuota, se responde
  "El servicio de IA está descansando un momento..." (código ai_resting).

Los contadores viven en memoria del proceso y se reinician cada día (hora de Chile) o al
reiniciar el servidor. En plan gratuito esto basta: si se excede la cuota real de Google,
Google responde 429 sin costo y se muestra el mismo mensaje.
"""

import contextvars
import hashlib
import os
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple


RESTING_MESSAGE = (
    "El servicio de IA está descansando un momento, intenta de nuevo en unos minutos. "
    "Si tienes tu propia clave de IA, conéctala en Ajustes para seguir sin límites."
)

# Chile continental (UTC-3/-4). Para el corte diario basta un desfase fijo de -4 h.
_CHILE_OFFSET = timedelta(hours=-4)


def _env_int(name: str, default: int) -> int:
    try:
        return max(0, int(os.getenv(name, str(default))))
    except ValueError:
        return default


def per_user_limit() -> int:
    return _env_int("SHARED_AI_DAILY_LIMIT_PER_USER", 15)


def per_ip_limit() -> int:
    # Varias personas pueden compartir IP (oficina, liceo); se permite el triple.
    return _env_int("SHARED_AI_DAILY_LIMIT_PER_IP", per_user_limit() * 3)


def total_limit() -> int:
    return _env_int("SHARED_AI_DAILY_LIMIT_TOTAL", 500)


def shared_key() -> str:
    if os.getenv("SHARED_AI_ENABLED", "true").lower() in ("0", "false", "no"):
        return ""
    from app.config import settings
    return settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")


def is_enabled() -> bool:
    return bool(shared_key())


@dataclass
class SharedAIRequest:
    """Datos de la petición actual (los fija el middleware)."""
    client_id: str
    ip: str
    consent: bool
    charged: bool = False
    remaining: Optional[int] = None


current_shared_ai_request: contextvars.ContextVar[Optional[SharedAIRequest]] = contextvars.ContextVar(
    "current_shared_ai_request", default=None
)


def _today() -> str:
    return (datetime.now(timezone.utc) + _CHILE_OFFSET).strftime("%Y-%m-%d")


def _anon(value: str) -> str:
    """No se guardan IP ni IDs en claro: solo un hash corto."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


@dataclass
class _DayCounters:
    day: str
    users: Dict[str, int] = field(default_factory=dict)
    ips: Dict[str, int] = field(default_factory=dict)
    total: int = 0


class SharedAIQuota:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._c = _DayCounters(day=_today())

    def _roll(self) -> None:
        today = _today()
        if self._c.day != today:
            self._c = _DayCounters(day=today)

    def _keys(self, client_id: str, ip: str) -> Tuple[str, str]:
        return _anon("u:" + (client_id or ip)), _anon("ip:" + ip)

    def remaining(self, client_id: str, ip: str) -> int:
        with self._lock:
            self._roll()
            u, i = self._keys(client_id, ip)
            return max(0, min(
                per_user_limit() - self._c.users.get(u, 0),
                per_ip_limit() - self._c.ips.get(i, 0),
                total_limit() - self._c.total,
            ))

    def consume(self, client_id: str, ip: str) -> int:
        """Descuenta 1 consulta. Devuelve lo que queda o lanza AIRestingError."""
        with self._lock:
            self._roll()
            u, i = self._keys(client_id, ip)
            used_u, used_i = self._c.users.get(u, 0), self._c.ips.get(i, 0)
            if used_u >= per_user_limit() or used_i >= per_ip_limit() or self._c.total >= total_limit():
                from app.agents.llm_provider import AIRestingError  # import diferido: evita ciclo
                raise AIRestingError(RESTING_MESSAGE)
            self._c.users[u] = used_u + 1
            self._c.ips[i] = used_i + 1
            self._c.total += 1
            return max(0, min(
                per_user_limit() - self._c.users[u],
                per_ip_limit() - self._c.ips[i],
                total_limit() - self._c.total,
            ))

    def refund(self, client_id: str, ip: str) -> int:
        """Devuelve 1 consulta (cuando la falla fue de Google y no de la persona)."""
        with self._lock:
            self._roll()
            u, i = self._keys(client_id, ip)
            if self._c.users.get(u, 0) > 0:
                self._c.users[u] -= 1
            if self._c.ips.get(i, 0) > 0:
                self._c.ips[i] -= 1
            if self._c.total > 0:
                self._c.total -= 1
        return self.remaining(client_id, ip)

    def reset(self) -> None:
        with self._lock:
            self._c = _DayCounters(day=_today())


quota = SharedAIQuota()


def charge_current_request() -> None:
    """Descuenta el cupo una sola vez por petición HTTP."""
    req = current_shared_ai_request.get()
    if req is None:
        # Fuera de una petición HTTP (scripts, MCP local): sin cupo.
        return
    if req.charged:
        return
    req.remaining = quota.consume(req.client_id, req.ip)
    req.charged = True


def refund_current_request() -> None:
    """Si la consulta ya se descontó y Google falló, se devuelve."""
    req = current_shared_ai_request.get()
    if req is None or not req.charged:
        return
    req.remaining = quota.refund(req.client_id, req.ip)
    req.charged = False
