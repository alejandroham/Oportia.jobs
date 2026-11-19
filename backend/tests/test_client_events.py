"""POST /api/event: solo tipos y valores de una lista cerrada, sin contenido personal."""

from fastapi.testclient import TestClient

from app import main
from app.main import app
from app.utils.rate_limiter import event_rate_limiter


def capture(monkeypatch):
    calls = []
    monkeypatch.setattr(main.telemetry, "record", lambda *a, **k: calls.append(a))
    event_rate_limiter.clear()
    return calls


def test_consent_event_keeps_only_allowed_values(monkeypatch):
    calls = capture(monkeypatch)
    r = TestClient(app).post("/api/event", json={"kind": "consentimiento_ia", "detail": {
        "accion": "acepta", "version": "2026-11-18", "codigo": "A1B2C3D4", "nombre": "Rosa Pérez", "correo": "rosa@x.cl"}},
        headers={"X-Oportia-Client": "11111111-2222-3333-4444-555555555555"})
    assert r.status_code == 200
    kind, category, detail = calls[0][0], calls[0][1], calls[0][2]
    assert kind == "consentimiento_ia" and category == "uso"
    assert detail == {"accion": "acepta", "version": "2026-11-18", "codigo": "A1B2C3D4"}


def test_rejects_unknown_kinds_and_bad_values(monkeypatch):
    calls = capture(monkeypatch)
    assert TestClient(app).post("/api/event", json={"kind": "cv_completo", "detail": {}}).status_code == 400
    TestClient(app).post("/api/event", json={"kind": "consentimiento_ia", "detail": {"accion": "hackear", "version": "<script>"}})
    assert calls[-1][2] == {}
