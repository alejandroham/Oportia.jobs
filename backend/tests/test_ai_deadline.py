"""La conexión con Gemini respeta el presupuesto de tiempo de la petición (Vercel corta a los 60 s)."""
import time

import pytest

from app.agents import llm_context
from app.agents.llm_provider import LLMProviderError, llm


def test_no_query_when_time_is_almost_over(monkeypatch):
    monkeypatch.setattr(llm, "_shared_gemini_key", lambda: "clave-de-prueba")
    token = llm_context.current_ai_deadline.set(time.monotonic() + 3)
    try:
        with pytest.raises(LLMProviderError) as e:
            llm._generate_text_raw("hola")
        assert e.value.code == "timeout"
    finally:
        llm_context.current_ai_deadline.reset(token)
