import contextvars
from typing import Optional, NamedTuple

class LLMCredentials(NamedTuple):
    provider: str
    api_key: str
    model_name: Optional[str] = None

# Thread-safe and async-safe request context for ephemeral client-provided API keys
current_llm_credentials: contextvars.ContextVar[Optional[LLMCredentials]] = contextvars.ContextVar(
    "current_llm_credentials", default=None
)


# Presupuesto de tiempo de la petición actual (segundos de time.monotonic()). Vercel corta la función a los 60 s:
# las consultas a la IA se detienen antes para que la app siempre responda (con IA o con la lectura sin IA).
REQUEST_AI_BUDGET_SECONDS = 50.0
current_ai_deadline: contextvars.ContextVar[Optional[float]] = contextvars.ContextVar("current_ai_deadline", default=None)


def ai_seconds_left(default: float = REQUEST_AI_BUDGET_SECONDS) -> float:
    import time
    deadline = current_ai_deadline.get()
    return default if deadline is None else deadline - time.monotonic()
