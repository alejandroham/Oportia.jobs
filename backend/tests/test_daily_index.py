"""Etapa B: índice diario de ofertas (armado, limpieza, publicación y búsqueda)."""

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.indexer import store
from app.indexer.build import build_index, classify_area, merge_jobs, stable_id
from app.indexer.search import search_index
from app.indexer.store import decode_index, encode_index, index_cache
from app.main import app
from app.models.schemas import JobPosting
from app.utils.cache import job_search_cache

NOW = datetime(2026, 11, 16, 11, 0, tzinfo=timezone.utc)


def mk(title, company="Empresa", url=None, location="Santiago, Región Metropolitana", **kw):
    return JobPosting(title=title, company=company, location=location, description=kw.pop("description", title),
                      url=url, source=kw.pop("source", "chiletrabajos"), **kw)


@pytest.fixture(autouse=True)
def clean_caches():
    job_search_cache.clear()
    index_cache.set(None)
    yield
    job_search_cache.clear()
    index_cache._loaded_at = 0.0
    index_cache._index = None


def test_classify_area_by_dictionary():
    assert classify_area("Técnico en Enfermería (TENS) Urgencia") == "Salud"
    assert classify_area("Vendedor/a de tienda part time") == "Comercio y ventas"
    assert classify_area("Guardia de seguridad 4x4") == "Seguridad"
    assert classify_area("Bodeguero turno noche") == "Logística y transporte"
    assert classify_area("Educadora de párvulos") == "Educación"


def test_stable_id_keeps_query_ids_and_ignores_tracking():
    a = mk("Cargo", url="https://www.empleospublicos.cl/pub/aviso.aspx?i=1&c=0")
    b = mk("Cargo", url="https://www.empleospublicos.cl/pub/aviso.aspx?i=2&c=0")
    c = mk("Cargo", url="https://www.empleospublicos.cl/pub/aviso.aspx?i=1&c=0&utm_source=x")
    assert stable_id(a) != stable_id(b)
    assert stable_id(a) == stable_id(c)
    # La portada del portal no identifica una oferta: se usa cargo + empresa + lugar.
    assert stable_id(mk("A", url="https://www.empleospublicos.cl/")) != stable_id(mk("B", url="https://www.empleospublicos.cl/"))


def test_merge_dedupes_drops_expired_and_keeps_first_seen():
    raw = [
        mk("TENS Urgencia", url="https://x.cl/o/1"),
        mk("TENS Urgencia", url="https://x.cl/o/1"),                       # misma URL
        mk("tens urgencia", url="https://otro.cl/9"),                      # mismo cargo + empresa + ciudad
        mk("Vendedor", url="https://x.cl/o/2", deadline="2026-11-10T12:00:00"),  # vencida
        mk("Profesor", url="https://x.cl/o/3", posted_at="2026-09-01"),    # más de 30 días
        mk("Abogado", url="https://x.cl/o/4", posted_at="2026-09-01", deadline="2026-11-30"),  # antigua pero abierta
    ]
    previous = {"jobs": [{"id": stable_id(raw[0]), "discovered_at": "2026-11-14"}]}
    jobs = merge_jobs(raw, previous, NOW)
    titles = [j["title"] for j in jobs]
    assert titles == ["TENS Urgencia", "Abogado"]
    assert jobs[0]["discovered_at"] == "2026-11-14"
    assert jobs[1]["discovered_at"] == "2026-11-16"
    assert jobs[0]["profession_category"] == "Salud"
    assert jobs[0]["region"]  # ubicación anotada


def test_build_index_summary_and_roundtrip():
    index = build_index([mk("TENS", url="https://x.cl/1"), mk("Bodeguero", url="https://x.cl/2")], {"ChileTrabajos": 2}, None, NOW)
    assert index["count"] == 2 and index["new_today"] == 2
    assert index["areas"] == {"Salud": 1, "Logística y transporte": 1}
    data = encode_index(index)
    assert data[:2] == b"\x1f\x8b"
    assert decode_index(data) == index


def test_search_index_relevance_and_remote():
    index = build_index([
        mk("Encargado de Informática", url="https://x.cl/1"),
        mk("Psicólogo", url="https://x.cl/2"),
        mk("Soporte TI remoto", url="https://x.cl/3", location="Remoto", is_remote=True),
    ], {}, None, NOW)
    # "Soporte TI" es sinónimo de informática; el psicólogo queda fuera.
    assert [j.title for j in search_index(index, "encargado informatica")] == ["Encargado de Informática", "Soporte TI remoto"]
    assert [j.title for j in search_index(index, "", remote_only=True)] == ["Soporte TI remoto"]


def _index_with(n):
    return build_index([mk(f"Vendedor tienda {i}", company=f"Tienda {i}", url=f"https://x.cl/{i}") for i in range(n)], {}, None, NOW)


def test_search_answers_from_index_without_live_sources():
    index_cache.set(_index_with(10))
    with patch("app.main.ChilePortalsScraper.search_with_status", side_effect=AssertionError("no debe buscar en vivo")), \
         patch("app.main.RemoteBoardsScraper.search_with_status", side_effect=AssertionError("no debe buscar en vivo")), \
         patch("app.main.ats_scraper.search", side_effect=AssertionError("no debe buscar en vivo")):
        data = TestClient(app).post("/api/jobs/search", json={"keywords": "vendedor"}).json()
    assert data["from_index"] is True
    assert data["total"] == 10 and data["index_count"] == 10
    assert data["jobs"][0]["id"].startswith("ix-")


def test_live_search_merges_index_first():
    index_cache.set(_index_with(2))  # pocas: también busca en vivo
    live = [mk("Vendedor en terreno", company="Otra", url="https://live.cl/1")]
    with patch("app.main.ChilePortalsScraper.search_with_status", return_value=(live, [])), \
         patch("app.main.RemoteBoardsScraper.search_with_status", return_value=([], [])), \
         patch("app.main.ats_scraper.search", return_value=[]):
        data = TestClient(app).post("/api/jobs/search", json={"keywords": "vendedor"}).json()
    assert data["from_index"] is False
    assert data["total"] == 3
    assert data["index_generated_at"]


def test_index_status_endpoint():
    client = TestClient(app)
    assert client.get("/api/jobs/index/status").json() == {"available": False}
    index_cache.set(_index_with(3))
    st = client.get("/api/jobs/index/status").json()
    assert st["available"] and st["count"] == 3 and "jobs" not in st


def test_public_url_and_upload_needs_secret(monkeypatch):
    monkeypatch.delenv("OPORTIA_INDEX_URL", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://abc.supabase.co/")
    assert store.index_public_url() == "https://abc.supabase.co/storage/v1/object/public/oportia-index/jobs-index.json.gz"
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    with pytest.raises(RuntimeError):
        store.upload_index({"jobs": []})


def test_auth_headers_support_new_and_legacy_keys():
    assert store.auth_headers("sb_secret_abc") == {"apikey": "sb_secret_abc"}
    assert store.auth_headers(" eyJhbGciOi.x.y\n") == {"apikey": "eyJhbGciOi.x.y", "Authorization": "Bearer eyJhbGciOi.x.y"}
    assert store.auth_headers('"Bearer eyJa.b.c"') == {"apikey": "eyJa.b.c", "Authorization": "Bearer eyJa.b.c"}
    assert store.key_kind("sb_publishable_x").startswith("PÚBLICA")


def test_upload_retries_with_bearer_and_reports_key_kind(monkeypatch):
    calls = []

    class R:
        def __init__(self, code):
            self.status_code, self.text = code, "headers must have required property 'authorization'"

    def fake_post(url, data, headers, timeout):
        calls.append(headers)
        return R(200 if "Authorization" in headers else 400)

    monkeypatch.setenv("SUPABASE_URL", "https://abc.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_abc")
    monkeypatch.setattr(store.requests, "post", fake_post)
    store.upload_index({"jobs": []})
    assert [("Authorization" in h) for h in calls] == [False, True]

    monkeypatch.setattr(store.requests, "post", lambda *a, **k: R(403))
    with pytest.raises(RuntimeError) as e:
        store.upload_index({"jobs": []})
    assert "secreta nueva" in str(e.value) and "sb_secret_abc" not in str(e.value)


def test_profile_keywords_search_index_for_you():
    index_cache.set(build_index([
        mk("Técnico de Soporte TI", url="https://x.cl/1"),
        mk("Encargado de Redes y Soporte TI", url="https://x.cl/2"),
        mk("Psicólogo", url="https://x.cl/3"),
        mk("Analista de Mesa de Ayuda", url="https://x.cl/4"),
    ] + [mk(f"Administrador de redes {i}", company=f"E{i}", url=f"https://x.cl/r{i}") for i in range(6)], {}, None, NOW))
    with patch("app.main.ChilePortalsScraper.search_with_status", side_effect=AssertionError("no en vivo")), \
         patch("app.main.RemoteBoardsScraper.search_with_status", side_effect=AssertionError("no en vivo")), \
         patch("app.main.ats_scraper.search", side_effect=AssertionError("no en vivo")):
        data = TestClient(app).post("/api/jobs/search", json={
            "keywords": "", "profile_keywords": ["Soporte TI", "Redes", "Mesa de ayuda"]}).json()
    titles = [j["title"] for j in data["jobs"]]
    assert data["from_index"] is True
    assert "Psicólogo" not in titles
    assert titles[0] == "Encargado de Redes y Soporte TI"  # calza con más términos
    assert "Analista de Mesa de Ayuda" in titles


def test_expiry_rules_real_estimated_and_45_days_without_dates():
    from app.indexer.build import compute_expiry
    # 1) Fecha de cierre real.
    assert compute_expiry(mk("A", deadline="2026-11-20T12:00:00"), "2026-11-01", NOW) == ("2026-11-20", False)
    # 2) Solo publicación: +30 días, estimada.
    assert compute_expiry(mk("B", posted_at="2026-11-01"), "2026-11-05", NOW) == ("2026-12-01", True)
    # 3) Sin fechas: primera vez vista + 45 días, estimada.
    assert compute_expiry(mk("C"), "2026-11-10", NOW) == ("2026-12-25", True)
    # Portal de empresa: se renueva mientras siga publicada (mínimo una semana).
    assert compute_expiry(mk("D", source="lever", posted_at="2024-09-03"), "2026-09-01", NOW) == ("2026-11-23", True)


def test_offers_without_dates_leave_the_index_after_45_days():
    job = mk("Maestro de obras", url="https://ct.cl/9")
    old = {"jobs": [{"id": stable_id(job), "discovered_at": "2026-09-30"}]}   # 47 días antes
    recent = {"jobs": [{"id": stable_id(job), "discovered_at": "2026-10-10"}]}
    assert merge_jobs([job], old, NOW) == []
    kept = merge_jobs([job], recent, NOW)
    assert kept[0]["expires_at"] == "2026-11-24" and kept[0]["expires_estimated"] is True


CHILETRABAJOS_HTML = """
<div class="job-item with-thumb">
  <h2 class="title"><a href="https://www.chiletrabajos.cl/trabajo/tecnico-en-construccion-1">Tecnico en construccion</a></h2>
  <h3 class="meta">Desarrollos urbanos spa, <a href="/ciudad/santiago.html">Santiago</a></h3>
  <h3 class="meta"><a href="#"><i></i> 16 de  Noviembre de 2026</a></h3>
  <p class="description">Supervisión de partidas, cubicaciones y BIM… <a class="ver-mas-btn">Ver más</a></p>
</div>
"""


def test_chiletrabajos_parses_current_html():
    from app.scrapers.chile_portals import ChileTrabajosСraper

    class Resp:
        status_code = 200
        text = CHILETRABAJOS_HTML

    with patch("app.scrapers.chile_portals.httpx.Client.get", return_value=Resp()) as get:
        jobs = ChileTrabajosСraper().search(keywords="técnico en construcción", limit=5)
    assert get.call_args.args[0] == "https://www.chiletrabajos.cl/encuentra-un-empleo"
    assert get.call_args.kwargs["params"] == {"2": "técnico en construcción"}
    j = jobs[0]
    assert (j.title, j.company, j.location, j.posted_at) == ("Tecnico en construccion", "Desarrollos urbanos spa", "Santiago", "2026-11-16")
    assert "BIM" in j.description and "Ver más" not in j.description
    assert compute_expiry_for(j) == ("2026-12-16", True)  # publicación + 30 días


def compute_expiry_for(job):
    from app.indexer.build import compute_expiry
    return compute_expiry(job, "2026-11-17", NOW)


def test_construction_synonyms_find_supervision_roles():
    from app.utils.keywords import relevance_score
    for title in ["Capataz de obra gruesa", "Jefe de Terreno", "Inspector Técnico de Obra (ITO)", "Supervisor de obra"]:
        assert relevance_score(title, "", "técnico en construcción") > 0, title
    assert relevance_score("Modelador BIM / Revit", "", "BIM") > 0


def test_removed_offers_tell_expired_from_unlisted():
    from app.indexer.build import history_entry, removed_offers
    previous = {"jobs": [
        {"id": "a", "title": "Sigue", "expires_at": "2026-12-01"},
        {"id": "b", "title": "Vencida", "expires_at": "2026-11-10", "source": "chiletrabajos"},
        {"id": "c", "title": "La quitó la fuente", "expires_at": "2026-12-20"},
    ]}
    current = {"jobs": [{"id": "a"}], "generated_at": "2026-11-17T11:00:00+00:00", "count": 1, "new_today": 0, "sources": {}, "areas": {}}
    removed = removed_offers(previous, current, NOW)
    assert {r["title"]: r["reason"] for r in removed} == {"Vencida": "vencida", "La quitó la fuente": "ya no publicada"}
    assert all(r["removed_at"] == "2026-11-16" or r["removed_at"] == NOW.strftime("%Y-%m-%d") for r in removed)
    h = history_entry(current, removed)
    assert h["date"] == "2026-11-17" and h["removed_expired"] == 1 and h["removed_unlisted"] == 1
    assert removed_offers(None, current, NOW) == []
