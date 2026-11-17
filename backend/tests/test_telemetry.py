"""Registro anónimo para el portal de administración: sin datos personales y con huellas que cambian cada día."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app import telemetry
from app.main import app


def test_event_has_no_personal_data_and_hashes_rotate_daily(monkeypatch):
    monkeypatch.setenv("METRICS_SALT", "sal-de-prueba")
    ev = telemetry.build_event("busqueda", "uso", {"ia": "gratuita", "texto": "x" * 500}, client_id="abc-123-cliente", ip="190.20.30.40")
    assert ev["client_hash"] and len(ev["client_hash"]) == 16 and "abc" not in ev["client_hash"]
    assert ev["ip_hash"] is None  # la IP solo se usa en eventos de seguridad
    assert len(ev["detail"]["texto"]) == 120
    sec = telemetry.build_event("limite_peticiones", "seguridad", {}, ip="190.20.30.40")
    same_net = telemetry.build_event("limite_peticiones", "seguridad", {}, ip="190.20.30.99")
    assert sec["ip_hash"] == same_net["ip_hash"]  # IP truncada a /24
    with patch.object(telemetry, "datetime") as dt:
        dt.now.return_value.strftime.return_value = "2030-01-02"
        tomorrow = telemetry.build_event("busqueda", "uso", {}, client_id="abc-123-cliente")
    assert tomorrow["client_hash"] != ev["client_hash"]  # al día siguiente, otra huella


def test_disabled_in_tests_and_without_config(monkeypatch):
    calls = []
    monkeypatch.setattr(telemetry.requests, "post", lambda *a, **k: calls.append(1))
    telemetry.record("busqueda")
    assert calls == []  # durante las pruebas nunca envía nada


def test_middleware_records_usage_and_security(monkeypatch):
    events = []
    monkeypatch.setattr(telemetry, "record", lambda kind, category="uso", detail=None, *a, **k: events.append((kind, category, detail)))
    client = TestClient(app)
    client.get("/api/settings", headers={"X-Oportia-Client": "cliente-de-prueba-1"})
    client.post("/api/jobs/import-url", json={"url": "https://cl.indeed.com/viewjob?jk=1"})
    kinds = [e[0] for e in events]
    assert "visita" in kinds and "portal_restringido" in kinds
    assert ("oferta_por_enlace", "uso", {"ia": "ninguna", "ok": False}) in events
