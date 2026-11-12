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
