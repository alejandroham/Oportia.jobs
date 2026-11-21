"""1.6.10 (DT-27): cabeceras de seguridad de Vercel (vercel.json) para la app y la API."""
import json
from pathlib import Path

VERCEL = json.loads((Path(__file__).resolve().parents[2] / "vercel.json").read_text())


def _security_route():
    first = VERCEL["routes"][0]
    assert first["src"] == "/(.*)" and first.get("continue") is True, "las cabeceras deben ir primero y continuar"
    return first["headers"]


def test_headers_apply_to_every_path_including_api():
    h = _security_route()
    for name in ("X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"):
        assert name in h
    assert h["X-Content-Type-Options"] == "nosniff"
    assert h["X-Frame-Options"] == "DENY"
    assert h["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_csp_starts_report_only_and_covers_what_the_app_loads():
    h = _security_route()
    assert "Content-Security-Policy" not in h, "la primera semana va en modo solo informe"
    csp = dict(
        (part.split(" ", 1) + [""])[:2] for part in (p.strip() for p in h["Content-Security-Policy-Report-Only"].split(";"))
    )
    assert csp["default-src"] == "'self'"
    assert csp["script-src"] == "'self'"                     # sin scripts externos ni en línea
    assert "https://fonts.googleapis.com" in csp["style-src"]  # Google Fonts (index.html)
    assert "https://fonts.gstatic.com" in csp["font-src"]
    assert csp["connect-src"] == "'self'"                    # la API es del mismo origen
    assert csp["frame-ancestors"] == "'none'" and csp["object-src"] == "'none'"


def test_permissions_allow_only_the_microphone_for_voice_dictation():
    p = _security_route()["Permissions-Policy"]
    assert "camera=()" in p and "geolocation=()" in p
    assert "microphone=(self)" in p  # "Dictar por voz" en el simulador de entrevistas
