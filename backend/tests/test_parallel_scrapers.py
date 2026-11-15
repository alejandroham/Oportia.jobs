"""
Tests for concurrent scraper execution, strict per-source timeouts,
and JobSearchResponse reporting (sources_failed and partial results).
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.scrapers.remote_boards import RemoteBoardsScraper
from app.models.schemas import JobPosting
from app.utils.cache import job_search_cache


@pytest.fixture
def api_client():
    return TestClient(app)


def test_remote_boards_search_with_status_all_succeed():
    scraper = RemoteBoardsScraper()
    sample_jobs = [
        JobPosting(
            title="Software Engineer",
            company="Empresa A",
            location="Remote",
            is_remote=True,
            description="Python engineer",
            source="arbeitnow"
        )
    ]
    with patch.object(scraper, "_fetch_arbeitnow", return_value=sample_jobs), \
         patch.object(scraper, "_fetch_remotive", return_value=[]), \
         patch.object(scraper, "_fetch_remoteok", return_value=[]):
        jobs, failed = scraper.search_with_status(keywords="python", limit=10)
        assert len(jobs) == 1
        assert jobs[0].title == "Software Engineer"
        assert failed == []


def test_remote_boards_search_with_status_partial_failure():
    scraper = RemoteBoardsScraper()
    sample_job = JobPosting(
        title="Frontend Dev",
        company="Empresa B",
        location="Remote",
        is_remote=True,
        description="React dev",
        source="arbeitnow"
    )

    def failing_fetch(*args, **kwargs):
        raise TimeoutError("Remotive connection timed out after 5.0s")

    with patch.object(scraper, "_fetch_arbeitnow", return_value=[sample_job]), \
         patch.object(scraper, "_fetch_remotive", side_effect=failing_fetch), \
         patch.object(scraper, "_fetch_remoteok", return_value=[]):
        jobs, failed = scraper.search_with_status(keywords="frontend", limit=10)
        assert len(jobs) == 1
        assert "Remotive" in failed


def test_search_jobs_stateless_endpoint_concurrency_and_failures(api_client):
    job_search_cache.clear()

    mock_sample_job = JobPosting(
        title="Full Stack Engineer",
        company="Global Corp",
        location="Santiago, Chile",
        is_remote=False,
        description="Full stack dev role",
        source="chiletrabajos"
    )

    def mock_failing_remote(*args, **kwargs):
        return [], ["Arbeitnow", "RemoteOK"]

    def mock_failing_linkedin(*args, **kwargs):
        raise ConnectionError("LinkedIn guest rate limit reached")

    def mock_working_chile(*args, **kwargs):
        return [mock_sample_job], []

    with patch("app.main.RemoteBoardsScraper.search_with_status", side_effect=mock_failing_remote), \
         patch("app.main.LinkedInGuestScraper.search", side_effect=mock_failing_linkedin), \
         patch("app.main.ChilePortalsScraper.search_with_status", side_effect=mock_working_chile), \
         patch("app.main.ats_scraper.search", return_value=[]):

        # LinkedIn global solo se consulta para trabajo remoto.
        resp = api_client.post("/api/jobs/search", json={
            "keywords": "Full Stack",
            "remote_only": True,
            "search_scope": "all"
        })

        assert resp.status_code == 200
        data = resp.json()
        assert "jobs" in data
        assert "sources_failed" in data
        assert "total" in data

        assert len(data["jobs"]) == 1
        assert data["jobs"][0]["title"] == "Full Stack Engineer"
        # Failed sources should include LinkedIn and the failed remote boards
        assert "LinkedIn Remoto" in data["sources_failed"]
        assert "Arbeitnow" in data["sources_failed"]
        assert "RemoteOK" in data["sources_failed"]
        assert data["total"] == 1


def test_search_jobs_stateless_endpoint_caching(api_client):
    job_search_cache.clear()

    sample_job = JobPosting(
        title="DevOps Specialist",
        company="Cloud Ops",
        location="Worldwide Remote",
        is_remote=True,
        description="Kubernetes & Terraform",
        source="remotive"
    )

    with patch("app.main.RemoteBoardsScraper.search_with_status", return_value=([sample_job], [])), \
         patch("app.main.LinkedInGuestScraper.search", return_value=[]), \
         patch("app.main.ats_scraper.search", return_value=[]):

        # First request
        resp1 = api_client.post("/api/jobs/search", json={
            "keywords": "DevOps",
            "remote_only": True,
            "search_scope": "global"
        })
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["total"] == 1

        # Second request must hit cache without invoking scrapers
        with patch("app.main.RemoteBoardsScraper.search_with_status", side_effect=Exception("Should not be called")):
            resp2 = api_client.post("/api/jobs/search", json={
                "keywords": "DevOps",
                "remote_only": True,
                "search_scope": "global"
            })
            assert resp2.status_code == 200
            data2 = resp2.json()
            assert data2["total"] == 1
            assert data2["jobs"][0]["title"] == "DevOps Specialist"


# ---------------------------------------------------------------------------
# Fase 1: búsqueda para todas las áreas, alcance regional y tiempo límite
# ---------------------------------------------------------------------------

def _job(title, source="test", location="Santiago, Chile", remote=False):
    return JobPosting(title=title, company="Empresa", location=location, is_remote=remote,
                      description=title, source=source)


def test_regional_scope_queries_chilean_portals(api_client):
    """El filtro "Solo mi región" envía search_scope='regional'; antes solo corría el ATS."""
    job_search_cache.clear()
    with patch("app.main.ChilePortalsScraper.search_with_status", return_value=([_job("Vendedor tienda")], [])) as chile, \
         patch("app.main.RemoteBoardsScraper.search_with_status", return_value=([], [])) as remote, \
         patch("app.main.ats_scraper.search", return_value=[]):
        data = api_client.post("/api/jobs/search", json={"keywords": "vendedor", "search_scope": "regional"}).json()
    assert chile.called
    assert not remote.called
    assert data["total"] == 1


def test_global_linkedin_only_for_remote_searches(api_client):
    """LinkedIn sin ubicación devuelve ofertas de EE. UU.; no se consulta en búsquedas presenciales."""
    job_search_cache.clear()
    with patch("app.main.ChilePortalsScraper.search_with_status", return_value=([], [])), \
         patch("app.main.RemoteBoardsScraper.search_with_status", return_value=([], [])), \
         patch("app.main.LinkedInGuestScraper.search", return_value=[]) as linkedin, \
         patch("app.main.ats_scraper.search", return_value=[]):
        api_client.post("/api/jobs/search", json={"keywords": "enfermera", "remote_only": False, "search_scope": "all"})
        assert not linkedin.called
        api_client.post("/api/jobs/search", json={"keywords": "enfermera", "remote_only": True, "search_scope": "all"})
        assert linkedin.called


def test_slow_source_does_not_block_search(api_client, monkeypatch):
    """Una fuente lenta se reporta como no disponible y no retrasa la respuesta."""
    import time as _time
    import app.main as main_module
    job_search_cache.clear()
    monkeypatch.setattr(main_module, "SEARCH_TOTAL_DEADLINE_SECONDS", 0.5)

    def slow(*args, **kwargs):
        _time.sleep(3)
        return [_job("Nunca llega")], []

    with patch("app.main.ChilePortalsScraper.search_with_status", side_effect=slow), \
         patch("app.main.RemoteBoardsScraper.search_with_status", return_value=([_job("Sales Associate", remote=True)], [])), \
         patch("app.main.ats_scraper.search", return_value=[]):
        start = _time.monotonic()
        data = api_client.post("/api/jobs/search", json={"keywords": "vendedor", "search_scope": "all"}).json()
        elapsed = _time.monotonic() - start
    assert elapsed < 2.0
    assert "Portales Chile" in data["sources_failed"]
    assert [j["title"] for j in data["jobs"]] == ["Sales Associate"]


def test_incomplete_results_are_not_cached(api_client):
    job_search_cache.clear()
    with patch("app.main.ChilePortalsScraper.search_with_status", return_value=([_job("Jefe de Bodega")], ["Laborum"])), \
         patch("app.main.RemoteBoardsScraper.search_with_status", return_value=([], [])), \
         patch("app.main.ats_scraper.search", return_value=[]):
        api_client.post("/api/jobs/search", json={"keywords": "bodega", "search_scope": "chile"})
    with patch("app.main.ChilePortalsScraper.search_with_status", return_value=([_job("Jefe de Bodega"), _job("Bodeguero")], [])) as chile, \
         patch("app.main.ats_scraper.search", return_value=[]):
        data = api_client.post("/api/jobs/search", json={"keywords": "bodega", "search_scope": "chile"}).json()
    assert chile.called
    assert data["total"] == 2


def test_chile_portals_run_in_parallel_and_report_failures():
    from app.scrapers.chile_portals import ChilePortalsScraper
    import time as _time

    class Fast:
        def search(self, **kwargs):
            return [_job("Vendedor")]

    class Slow:
        def search(self, **kwargs):
            _time.sleep(3)
            return [_job("Tarde")]

    class Broken:
        def search(self, **kwargs):
            raise RuntimeError("403")

    scraper = ChilePortalsScraper()
    scraper.SOURCES = {"Rápido": Fast, "Lento": Slow, "Roto": Broken}
    start = _time.monotonic()
    jobs, failed = scraper.search_with_status("vendedor", deadline=0.5)
    assert _time.monotonic() - start < 1.5
    assert [j.title for j in jobs] == ["Vendedor"]
    assert sorted(failed) == ["Lento", "Roto"]


def test_remote_boards_match_spanish_keywords_against_english_titles():
    scraper = RemoteBoardsScraper()
    feed = [_job("Registered Nurse", remote=True), _job("Senior Java Developer", remote=True)]

    def fake_arbeitnow(keywords, remote_only, limit):
        from app.utils.keywords import keyword_matches
        return [j for j in feed if keyword_matches(j.title, keywords)]

    with patch.object(scraper, "_fetch_arbeitnow", side_effect=fake_arbeitnow), \
         patch.object(scraper, "_fetch_remotive", return_value=[]), \
         patch.object(scraper, "_fetch_remoteok", return_value=[]):
        jobs, _ = scraper.search_with_status(keywords="enfermera", limit=10)
    assert [j.title for j in jobs] == ["Registered Nurse"]


def test_getonboard_parses_current_api_shape():
    """Formato real de la API v0: tags como referencias, empresa expandida y published_at epoch."""
    from app.scrapers.chile_portals import GetOnBoardScraper

    payload = {"data": [{
        "id": "vendedor-tienda-acme",
        "links": {"public_url": "https://www.getonbrd.com/jobs/vendedor-tienda-acme"},
        "attributes": {
            "title": "Vendedor/a de tienda",
            "description": "<p>Atención de público</p>",
            "remote_modality": "on_site",
            "countries": ["Chile"],
            "category_name": "Sales",
            "min_salary": 600000, "max_salary": 800000,
            "published_at": 1794573989,
            "tags": {"data": [{"id": 2, "type": "tag"}]},
            "company": {"data": {"id": "acme", "type": "company", "attributes": {"name": "ACME"}}},
        },
    }]}

    class Resp:
        status_code = 200
        def json(self):
            return payload

    class Client:
        def __init__(self, *a, **k): pass
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def get(self, *a, **k): return Resp()

    with patch("app.scrapers.chile_portals.httpx.Client", Client):
        jobs = GetOnBoardScraper().search("vendedor", limit=5)
    assert len(jobs) == 1
    j = jobs[0]
    assert j.company == "ACME"
    assert j.url == "https://www.getonbrd.com/jobs/vendedor-tienda-acme"
    assert j.tags == ["Sales"]
    assert j.posted_at.startswith("2026-")
    assert "Presencial" in j.location


def test_getonboard_skips_empty_query():
    from app.scrapers.chile_portals import GetOnBoardScraper
    with patch("app.scrapers.chile_portals.httpx.Client", side_effect=AssertionError("no debe llamar")):
        assert GetOnBoardScraper().search("") == []
