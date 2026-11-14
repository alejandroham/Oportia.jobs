"""
Entrega de archivos estáticos (logo, avatares de Opi) y rutas de la app (SPA)
cuando el backend sirve el frontend compilado (start_app.sh, puerto 8000).

No depende de frontend/dist real (está en .gitignore y no existe en CI):
cada test usa una carpeta dist temporal mínima.
"""

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app


@pytest.fixture
def fake_dist(tmp_path, monkeypatch):
    dist = tmp_path / "dist"
    (dist / "opi").mkdir(parents=True)
    (dist / "assets").mkdir()
    (dist / "index.html").write_text("<!doctype html><html><body><div id='root'></div></body></html>")
    (dist / "oportia-logo.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    (dist / "opi" / "opi-saludando-128.webp").write_bytes(b"RIFF\x00\x00\x00\x00WEBPVP8 ")
    (dist / "assets" / "index-abc.js").write_text("console.log('ok')")
    monkeypatch.setattr(main_module, "FRONTEND_DIST", dist)
    return dist


@pytest.fixture
def client():
    return TestClient(app)


def test_logo_svg_is_served_as_image(client, fake_dist):
    res = client.get("/oportia-logo.svg")
    assert res.status_code == 200
    assert "image/svg" in res.headers["content-type"]
    assert b"<svg" in res.content


def test_opi_webp_is_served_as_image(client, fake_dist):
    res = client.get("/opi/opi-saludando-128.webp")
    assert res.status_code == 200
    assert "image/webp" in res.headers["content-type"]


def test_bundled_assets_are_served(client, fake_dist):
    res = client.get("/assets/index-abc.js")
    assert res.status_code == 200
    assert "javascript" in res.headers["content-type"]


@pytest.mark.parametrize("spa_path", ["/", "/empleos", "/perfil", "/postulaciones", "/aprender", "/ajustes"])
def test_app_routes_return_index_html(client, fake_dist, spa_path):
    res = client.get(spa_path)
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    assert b"id='root'" in res.content


def test_missing_static_file_is_404_not_html(client, fake_dist):
    res = client.get("/opi/no-existe.webp")
    assert res.status_code == 404


def test_path_traversal_is_blocked(client, fake_dist):
    (fake_dist.parent / "secreto.txt").write_text("no")
    res = client.get("/..%2Fsecreto.txt")
    assert res.status_code == 404


def test_unknown_api_route_is_404_json(client, fake_dist):
    res = client.get("/api/no-existe")
    assert res.status_code == 404
    assert "application/json" in res.headers["content-type"]


def test_api_routes_and_transparent_rewrite_still_work(client, fake_dist):
    assert client.get("/api/health").json().get("status") == "healthy"
    assert client.get("/health").status_code == 200
    res_jobs = client.get("/jobs")  # reescrito a /api/jobs
    assert res_jobs.status_code == 200
    assert isinstance(res_jobs.json(), list)


def test_without_dist_app_routes_are_404(client, tmp_path, monkeypatch):
    monkeypatch.setattr(main_module, "FRONTEND_DIST", tmp_path / "no-existe")
    assert client.get("/empleos").status_code == 404
    assert client.get("/api/health").status_code == 200
