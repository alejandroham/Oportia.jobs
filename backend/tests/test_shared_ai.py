"""
IA gratuita de Oportia: clave del servidor con consentimiento y cupo diario.
Sin llamadas reales a Google: se reemplaza google.genai.Client por un doble.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.agents import shared_ai
from app.config import settings

CLIENT = "a1b2c3d4-0000-4000-8000-000000000001"
OTHER = "a1b2c3d4-0000-4000-8000-000000000002"


class _Resp:
    def __init__(self, text):
        self.text = text


class _FakeModels:
    calls = 0
    error = None

    def generate_content(self, model, contents, config=None):
        _FakeModels.calls += 1
        if _FakeModels.error:
            raise Exception(_FakeModels.error)
        return _Resp("Respuesta de prueba de Opi.")


class _FakeClient:
    keys = []

    def __init__(self, api_key):
        _FakeClient.keys.append(api_key)
        self.models = _FakeModels()


@pytest.fixture
def shared(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "server-key")
    monkeypatch.setenv("SHARED_AI_DAILY_LIMIT_PER_USER", "2")
    monkeypatch.setenv("SHARED_AI_DAILY_LIMIT_TOTAL", "100")
    monkeypatch.delenv("SHARED_AI_ENABLED", raising=False)
    from google import genai
    monkeypatch.setattr(genai, "Client", _FakeClient)
    _FakeModels.calls, _FakeModels.error, _FakeClient.keys = 0, None, []
    shared_ai.quota.reset()
    shared_ai.breaker.reset()
    from app.utils.rate_limiter import ai_rate_limiter
    ai_rate_limiter.clear()
    yield
    shared_ai.quota.reset()
    shared_ai.breaker.reset()


@pytest.fixture
def client():
    return TestClient(app)


def _chat(client, headers):
    return client.post(
        "/api/chat/opi",
        json={"message": "Hola Opi, ¿cómo mejoro mi CV?", "history": [], "profile": {"name": "Paula"}, "preferences": {}},
        headers=headers,
    )


def _shared_headers(client_id=CLIENT, consent=True):
    h = {"X-Oportia-Client": client_id}
    if consent:
        h["X-Oportia-Shared-AI-Consent"] = "1"
    return h


def test_settings_reports_shared_ai(shared, client):
    data = client.get("/api/settings", headers={"X-Oportia-Client": CLIENT}).json()
    assert data["shared_ai"] == {"available": True, "provider": "gemini", "daily_limit": 2, "remaining": 2, "state": "ok", "retry_after": 0}


def test_settings_without_server_key(client, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert client.get("/api/settings").json()["shared_ai"]["available"] is False


def test_shared_ai_requires_consent(shared, client):
    res = _chat(client, _shared_headers(consent=False))
    assert res.status_code == 403
    assert res.json()["error"] == "shared_ai_consent_required"
    assert _FakeModels.calls == 0


def test_shared_ai_counts_one_per_request_and_rests_when_exhausted(shared, client):
    r1 = _chat(client, _shared_headers())
    assert r1.status_code == 200
    assert r1.headers["X-Shared-AI-Remaining"] == "1"
    r2 = _chat(client, _shared_headers())
    assert r2.status_code == 200
    assert r2.headers["X-Shared-AI-Remaining"] == "0"

    r3 = _chat(client, _shared_headers())
    assert r3.status_code == 429
    body = r3.json()
    assert body["error"] == "ai_resting"
    assert "descansando" in body["message"]

    # Otra persona (otro navegador) aún tiene su cupo.
    assert _chat(client, _shared_headers(OTHER)).status_code == 200


def test_own_key_is_used_without_quota(shared, client):
    for _ in range(4):
        res = _chat(client, {"X-LLM-Provider": "gemini", "X-LLM-Key": "mi-clave-propia", "X-Oportia-Client": CLIENT})
        assert res.status_code == 200
        assert "X-Shared-AI-Remaining" not in res.headers
    assert set(_FakeClient.keys) == {"mi-clave-propia"}
    assert shared_ai.quota.remaining(CLIENT, "testclient") == 2


def test_google_quota_on_shared_key_shows_resting_and_is_not_charged(shared, client):
    _FakeModels.error = "429 RESOURCE_EXHAUSTED quota"
    res = _chat(client, _shared_headers())
    assert res.status_code == 429
    assert res.json()["error"] == "ai_resting"
    # La falla fue de Google: la persona conserva su cupo.
    assert res.headers["X-Shared-AI-Remaining"] == "2"
    assert shared_ai.quota.remaining(CLIENT, "testclient") == 2


def test_invalid_server_key_is_not_blamed_on_user(shared, client):
    _FakeModels.error = "400 API_KEY_INVALID"
    res = _chat(client, _shared_headers())
    assert res.json()["error"] == "ai_resting"


def test_total_daily_limit(shared, client, monkeypatch):
    monkeypatch.setenv("SHARED_AI_DAILY_LIMIT_TOTAL", "1")
    assert _chat(client, _shared_headers(CLIENT)).status_code == 200
    assert _chat(client, _shared_headers(OTHER)).json()["error"] == "ai_resting"


def test_purge_endpoints_no_longer_wipe_server_key(shared, client):
    client.post("/api/settings/purge")
    client.post("/api/purge-all")
    assert settings.GEMINI_API_KEY == "server-key"


def test_settings_post_does_not_change_global_model(shared, client):
    before = settings.GEMINI_MODEL
    client.post("/api/settings", json={"provider": "openai", "model_name": "otro-modelo"})
    assert settings.GEMINI_MODEL == before
    assert settings.DEFAULT_PROVIDER != "openai" or before == "openai"


def test_invalid_client_id_falls_back_to_ip():
    from app.main import _clean_client_id
    assert _clean_client_id("abc") == ""
    assert _clean_client_id("x" * 80) == ""
    assert _clean_client_id("<script>alert(1)</script>") == ""
    assert _clean_client_id(CLIENT) == CLIENT
