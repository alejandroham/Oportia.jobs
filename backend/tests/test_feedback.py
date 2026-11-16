"""Opiniones: validación, consentimiento de contacto y guardado en Supabase (simulado)."""

import pytest
from fastapi.testclient import TestClient

from app import feedback as fb
from app.main import app
from app.utils.rate_limiter import feedback_rate_limiter


@pytest.fixture(autouse=True)
def env(monkeypatch):
    feedback_rate_limiter.clear()
    monkeypatch.setenv("SUPABASE_URL", "https://abc.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    sent = {}

    class R:
        status_code = 201

    def fake_post(url, json, headers, timeout):
        sent.update(url=url, row=json, headers=headers)
        return R()

    monkeypatch.setattr(fb.requests, "post", fake_post)
    return sent


def test_saves_rating_and_comments_without_contact(env):
    res = TestClient(app).post("/api/opinion", json={"rating": 5, "liked": "  El índice diario ", "improve": ""})
    assert res.status_code == 200 and res.json()["ok"]
    row = env["row"]
    assert env["url"] == "https://abc.supabase.co/rest/v1/feedback"
    assert row["rating"] == 5 and row["liked"] == "El índice diario" and row["improve"] is None
    assert row["contact_email"] is None and row["contact_consent"] is False and row["consent_version"] is None
    assert env["headers"] == {"apikey": "sb_publishable_test", "Content-Type": "application/json", "Prefer": "return=minimal"}


def test_contact_requires_consent(env):
    res = TestClient(app).post("/api/opinion", json={"rating": 4, "contact_email": "persona@ejemplo.cl"})
    assert res.status_code == 422
    assert "autorización" in res.text
    assert "row" not in env


def test_contact_with_consent_is_saved_with_version(env):
    res = TestClient(app).post("/api/opinion", json={
        "rating": 4, "contact_email": "persona@ejemplo.cl", "contact_phone": "+56 9 1234 5678", "contact_consent": True, "trigger": "auto"})
    assert res.status_code == 200
    row = env["row"]
    assert row["contact_email"] == "persona@ejemplo.cl" and row["contact_phone"] == "+56 9 1234 5678"
    assert row["consent_version"] == fb.CONSENT_VERSION and row["trigger"] == "auto"


def test_consent_without_contact_stores_no_contact(env):
    res = TestClient(app).post("/api/opinion", json={"rating": 3, "contact_consent": True})
    assert res.status_code == 200 and env["row"]["contact_email"] is None


@pytest.mark.parametrize("payload", [
    {"rating": 0}, {"rating": 6}, {"rating": 5, "contact_email": "no-es-correo", "contact_consent": True},
    {"rating": 5, "contact_phone": "abc", "contact_consent": True}, {"rating": 5, "liked": "x" * 1001},
])
def test_invalid_payloads(env, payload):
    assert TestClient(app).post("/api/opinion", json=payload).status_code == 422


def test_not_configured_returns_503(monkeypatch):
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    res = TestClient(app).post("/api/opinion", json={"rating": 5})
    assert res.status_code == 503


def test_purge_deletes_rows_older_than_12_months(monkeypatch):
    calls = []

    class R:
        status_code = 204

    def fake_delete(url, params, headers, timeout):
        calls.append((url, params, headers))
        return R()

    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_x")
    monkeypatch.setattr(fb.requests, "delete", fake_delete)
    fb.purge_old_feedback()
    url, params, headers = calls[0]
    assert url == "https://abc.supabase.co/rest/v1/feedback"
    assert params["created_at"].startswith("lt.")
    assert headers["apikey"] == "sb_secret_x"


def test_honeypot_is_accepted_but_not_saved(env):
    res = TestClient(app).post("/api/opinion", json={"rating": 5, "website": "http://spam.example"})
    assert res.status_code == 200 and res.json()["ok"]
    assert "row" not in env


def test_database_cap_returns_429(monkeypatch):
    class R:
        status_code = 400
        text = '{"code":"P0001","message":"Demasiadas opiniones en poco tiempo."}'

    monkeypatch.setattr(fb.requests, "post", lambda *a, **k: R())
    res = TestClient(app).post("/api/opinion", json={"rating": 5})
    assert res.status_code == 429 and "minutos" in res.json()["detail"]
