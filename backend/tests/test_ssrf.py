"""Protección SSRF de "Importar oferta por URL": nunca descargar direcciones internas."""

import socket

import pytest

from app.scrapers import url_parser as up


def fake_dns(mapping):
    def _resolve(host, port, proto=0):
        ips = mapping.get(host)
        if ips is None:
            raise socket.gaierror("no existe")
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port)) for ip in ips]
    return _resolve


@pytest.mark.parametrize("url", [
    "http://localhost/admin",
    "http://127.0.0.1:9001/2018-06-01/runtime/invocation/next",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/",
    "http://192.168.1.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "file:///etc/passwd",
    "ftp://ejemplo.cl/oferta",
    "http://usuario:clave@ejemplo.cl/",
    "http://ejemplo.cl:22/",
    "http://interno.ejemplo.cl/",       # resuelve a una IP privada
    "http://mixto.ejemplo.cl/",         # una IP pública y otra privada
])
def test_blocks_internal_and_unsafe_urls(monkeypatch, url):
    monkeypatch.setattr(up.socket, "getaddrinfo", fake_dns({
        "localhost": ["127.0.0.1"], "interno.ejemplo.cl": ["10.1.2.3"], "mixto.ejemplo.cl": ["93.184.216.34", "172.16.0.9"],
        "ejemplo.cl": ["93.184.216.34"], "127.0.0.1": ["127.0.0.1"], "169.254.169.254": ["169.254.169.254"],
        "10.0.0.5": ["10.0.0.5"], "192.168.1.1": ["192.168.1.1"], "::1": ["::1"], "::ffff:127.0.0.1": ["::ffff:127.0.0.1"],
    }))
    with pytest.raises(up.UnsafeURLError):
        up.assert_public_url(url)


def test_allows_public_urls(monkeypatch):
    monkeypatch.setattr(up.socket, "getaddrinfo", fake_dns({"www.empleospublicos.cl": ["200.12.20.1"]}))
    up.assert_public_url("https://www.empleospublicos.cl/pub/aviso.aspx?i=1")


def test_redirect_to_internal_address_is_blocked(monkeypatch):
    monkeypatch.setattr(up.socket, "getaddrinfo", fake_dns({"publico.cl": ["93.184.216.34"], "169.254.169.254": ["169.254.169.254"]}))

    class Resp:
        def __init__(self, location=None):
            self.is_redirect = bool(location)
            self.headers = {"location": location} if location else {}
            self.status_code = 302 if location else 200

    calls = []

    class Client:
        def get(self, url):
            calls.append(url)
            return Resp("http://169.254.169.254/latest/meta-data/")

    with pytest.raises(up.UnsafeURLError):
        up._safe_get(Client(), "https://publico.cl/oferta")
    assert calls == ["https://publico.cl/oferta"]  # nunca pidió la dirección interna


def test_extract_returns_friendly_error(monkeypatch):
    monkeypatch.setattr(up.socket, "getaddrinfo", fake_dns({"localhost": ["127.0.0.1"]}))
    assert "interna" in up.extract_job_from_url("http://localhost/api/settings")["error"]
