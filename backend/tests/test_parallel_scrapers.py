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
        return [mock_sample_job]

    with patch("app.main.RemoteBoardsScraper.search_with_status", side_effect=mock_failing_remote), \
         patch("app.main.LinkedInGuestScraper.search", side_effect=mock_failing_linkedin), \
         patch("app.main.ChilePortalsScraper.search", side_effect=mock_working_chile), \
         patch("app.main.ats_scraper.search", return_value=[]):

        resp = api_client.post("/api/jobs/search", json={
            "keywords": "Full Stack",
            "remote_only": False,
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
        assert "LinkedIn Empleos" in data["sources_failed"]
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
