"""
1.6.5: confiabilidad de la IA gratuita.
- DT-15: cadena de modelos vigentes, plazo mínimo de Google (10 s) y respaldo rápido.
- DT-17: cortacircuitos tras fallas seguidas y estado público de la IA.
Casos tomados de los registros de producción del 20-nov-2026 (DT-14). Sin llamadas reales a Google.
"""
import time

import pytest
from fastapi.testclient import TestClient

from app.agents import llm_context, shared_ai
from app.agents.llm_provider import (
    AIRestingError, LLMProviderError, classify_gemini_error, gemini_models_to_try, gemini_timeout_seconds, llm,
)
from app.agents.models import CATALOG, DEFAULT_GEMINI_MODEL, FAST_GEMINI_MODEL, RETIRED_MODELS, current_model
from app.config import settings
from app.main import app

# Mensajes reales de los registros (recortados).
LOG_404 = "404 NOT_FOUND. {'error': {'code': 404, 'message': 'This model models/gemini-2.0-flash is no longer available.', 'status': 'NOT_FOUND'}}"
LOG_504 = "504 DEADLINE_EXCEEDED. {'error': {'code': 504, 'message': 'Deadline expired before operation could complete.', 'status': 'DEADLINE_EXCEEDED'}}"
LOG_429 = "429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota'}}"


class _Resp:
    def __init__(self, text):
        self.text = text


class _Script:
    """Respuesta por modelo: texto, o excepción (str)."""
    plan: dict = {}
    calls: list = []


class _Models:
    def generate_content(self, model, contents, config=None):
        _Script.calls.append((model, config["http_options"]["timeout"]))
        outcome = _Script.plan.get(model, "ok")
        if outcome != "ok":
            raise Exception(outcome)
        return _Resp(f"respuesta de {model}")


class _Client:
    def __init__(self, api_key):
        self.models = _Models()


@pytest.fixture
def gemini(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "server-key")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")  # lo que tenía producción por omisión
    monkeypatch.delenv("SHARED_AI_ENABLED", raising=False)
    from google import genai
    monkeypatch.setattr(genai, "Client", _Client)
    _Script.plan, _Script.calls = {}, []
    shared_ai.quota.reset()
    shared_ai.breaker.reset()
    yield
    shared_ai.quota.reset()
    shared_ai.breaker.reset()


def _call():
    return llm._generate_text_raw("hola")


# ---------- DT-15: modelos vigentes ----------

def test_catalog_only_offers_current_models():
    for provider, models in CATALOG.items():
        for m in models:
            assert m["id"] not in RETIRED_MODELS[provider], m["id"]
    assert DEFAULT_GEMINI_MODEL == "gemini-3.6-flash"


def test_retired_models_are_replaced_without_asking_google():
    assert gemini_models_to_try("gemini-2.0-flash") == [DEFAULT_GEMINI_MODEL, FAST_GEMINI_MODEL]
    assert gemini_models_to_try("gemini-1.5-flash") == [DEFAULT_GEMINI_MODEL, FAST_GEMINI_MODEL]
    assert gemini_models_to_try(FAST_GEMINI_MODEL) == [FAST_GEMINI_MODEL, DEFAULT_GEMINI_MODEL]
    assert current_model("openai", "o1") == "gpt-6.2-sol"
    assert current_model("claude", "claude-3-5-sonnet-latest") == "claude-sonnet-5-5"
    assert current_model("openai", "gpt-6.1-terra") == "gpt-6.1-terra"


def test_deadline_respects_google_minimum_of_10_seconds():
    assert gemini_timeout_seconds(50, has_fallback=True) == 34   # 13 s quedan para el respaldo
    assert gemini_timeout_seconds(20, has_fallback=True) == 17   # no alcanza a reservar: usa todo
    assert gemini_timeout_seconds(13, has_fallback=False) == 10
    assert gemini_timeout_seconds(12, has_fallback=False) is None  # antes pedía 9 s y Google respondía 400
    assert gemini_timeout_seconds(100, has_fallback=False) == 40


def test_classifies_the_errors_seen_in_production():
    assert classify_gemini_error(LOG_404) == "not_found"
    assert classify_gemini_error(LOG_504) == "timeout"
    assert classify_gemini_error(LOG_429) == "quota"
    assert classify_gemini_error("400 API_KEY_INVALID") == "invalid_key"


def test_default_chain_never_calls_a_retired_model(gemini):
    assert _call() == f"respuesta de {DEFAULT_GEMINI_MODEL}"
    assert [m for m, _ in _Script.calls] == [DEFAULT_GEMINI_MODEL]


def test_slow_primary_falls_back_to_fast_model(gemini):
    _Script.plan = {DEFAULT_GEMINI_MODEL: LOG_504}
    assert _call() == f"respuesta de {FAST_GEMINI_MODEL}"
    (m1, t1), (m2, t2) = _Script.calls
    assert (m1, m2) == (DEFAULT_GEMINI_MODEL, FAST_GEMINI_MODEL)
    assert t1 <= 34_000 and t2 >= 10_000


def test_quota_error_does_not_try_another_model_and_refunds(gemini):
    req = shared_ai.SharedAIRequest(client_id="c1", ip="1.1.1.1", consent=True)
    token = shared_ai.current_shared_ai_request.set(req)
    try:
        before = shared_ai.quota.remaining("c1", "1.1.1.1")
        _Script.plan = {DEFAULT_GEMINI_MODEL: LOG_429}
        with pytest.raises(AIRestingError):
            _call()
        assert len(_Script.calls) == 1
        assert shared_ai.quota.remaining("c1", "1.1.1.1") == before
    finally:
        shared_ai.current_shared_ai_request.reset(token)


def test_timeout_on_every_model_refunds_the_quota(gemini):
    req = shared_ai.SharedAIRequest(client_id="c2", ip="2.2.2.2", consent=True)
    token = shared_ai.current_shared_ai_request.set(req)
    try:
        before = shared_ai.quota.remaining("c2", "2.2.2.2")
        _Script.plan = {DEFAULT_GEMINI_MODEL: LOG_504, FAST_GEMINI_MODEL: LOG_504}
        with pytest.raises(LLMProviderError) as e:
            _call()
        assert e.value.code == "timeout"
        assert shared_ai.quota.remaining("c2", "2.2.2.2") == before
    finally:
        shared_ai.current_shared_ai_request.reset(token)


def test_no_call_when_less_than_google_minimum_is_left(gemini):
    token = llm_context.current_ai_deadline.set(time.monotonic() + 12)
    try:
        with pytest.raises(LLMProviderError) as e:
            _call()
        assert e.value.code == "timeout"
        assert _Script.calls == []
    finally:
        llm_context.current_ai_deadline.reset(token)


# ---------- DT-17: cortacircuitos ----------

def test_breaker_opens_after_three_failures_and_answers_instantly(gemini):
    _Script.plan = {DEFAULT_GEMINI_MODEL: LOG_429}
    for _ in range(3):
        with pytest.raises(AIRestingError):
            _call()
    assert shared_ai.breaker.is_open()
    calls = len(_Script.calls)
    started = time.monotonic()
    with pytest.raises(AIRestingError) as e:
        _call()
    assert time.monotonic() - started < 1
    assert len(_Script.calls) == calls  # no se consultó a Google
    assert "mucha demanda" in e.value.message


def test_breaker_closes_after_cooldown_and_success_resets():
    now = [0.0]
    b = shared_ai.SharedAIBreaker(clock=lambda: now[0])
    for _ in range(3):
        b.record_failure()
    assert b.is_open() and b.retry_after() == shared_ai.BREAKER_COOLDOWN_SECONDS
    now[0] += shared_ai.BREAKER_COOLDOWN_SECONDS + 1
    assert not b.is_open()
    b.record_failure(); b.record_failure(); b.record_success(); b.record_failure()
    assert not b.is_open()  # el éxito reinicia la cuenta


def test_failures_spread_over_more_than_5_minutes_do_not_open_it():
    now = [0.0]
    b = shared_ai.SharedAIBreaker(clock=lambda: now[0])
    for _ in range(3):
        b.record_failure()
        now[0] += shared_ai.BREAKER_WINDOW_SECONDS
    assert not b.is_open()


def test_status_endpoints_and_headers_report_busy(gemini):
    client = TestClient(app)
    assert client.get("/api/status").json()["shared_ai"]["state"] == "ok"
    for _ in range(3):
        shared_ai.breaker.record_failure()
    status = client.get("/api/status").json()["shared_ai"]
    assert status["state"] == "busy" and status["retry_after"] > 0
    settings_payload = client.get("/api/settings", headers={"X-Oportia-Client": "c3"}).json()["shared_ai"]
    assert settings_payload["state"] == "busy"
    r = client.post(
        "/api/chat/opi",
        json={"message": "Hola Opi", "history": [], "profile": {"name": "Paula"}, "preferences": {}},
        headers={"X-Oportia-Client": "a1b2c3d4-0000-4000-8000-000000000009", "X-Oportia-Shared-AI-Consent": "1"},
    )
    assert r.status_code == 429
    assert r.headers["X-Oportia-AI-State"] == "busy"
    assert int(r.headers["Retry-After"]) > 0
