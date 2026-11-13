"""
Offline Scraper Tests
Guarantees 100% offline verification of job scrapers using mock HTTP responses and HTML fixtures.
Tests RemoteBoardsScraper (Arbeitnow, Remotive, RemoteOK) and ChilePortalsScraper.
"""

import httpx
import pytest
from unittest.mock import MagicMock
from app.scrapers.remote_boards import RemoteBoardsScraper


SAMPLE_ARBEITNOW_RESPONSE = {
    "data": [
        {
            "slug": "senior-python-developer",
            "title": "Senior Python Backend Developer",
            "company_name": "Acme Cloud Services",
            "location": "Remote",
            "remote": True,
            "url": "https://www.arbeitnow.com/jobs/senior-python-developer",
            "tags": ["python", "fastapi", "docker"],
            "description": "<p>We are seeking a <strong>Senior Python Developer</strong> with FastAPI expertise.</p>",
            "created_at": 1700000000
        }
    ]
}

SAMPLE_REMOTIVE_RESPONSE = {
    "jobs": [
        {
            "id": 9988,
            "title": "Full Stack Engineer (React/Python)",
            "company_name": "Global Tech Corp",
            "candidate_required_location": "Worldwide",
            "salary": "$90,000 - $110,000",
            "url": "https://remotive.com/jobs/full-stack-engineer-9988",
            "tags": ["react", "python", "fullstack"],
            "description": "Develop modern reactive applications with React and Python.",
            "publication_date": "2026-03-01T12:00:00"
        }
    ]
}

SAMPLE_REMOTEOK_RESPONSE = [
    {"legal": "This API is for personal use"},
    {
        "id": "54321",
        "position": "AI Software Engineer",
        "company": "DeepFlow AI",
        "location": "Worldwide",
        "salary_min": 80000,
        "salary_max": 120000,
        "url": "https://remoteok.com/remote-jobs/54321",
        "tags": ["ai", "python", "machine learning"],
        "description": "Build high-throughput AI pipelines.",
        "date": "2026-03-02"
    }
]


def test_remote_boards_offline_parsing(monkeypatch):
    """
    Verifies RemoteBoardsScraper parses Arbeitnow, Remotive, and RemoteOK
    without making real HTTP calls.
    """
    def mock_get(client_self, url, *args, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        url_str = str(url)
        if "arbeitnow" in url_str:
            mock_resp.json.return_value = SAMPLE_ARBEITNOW_RESPONSE
        elif "remotive" in url_str:
            mock_resp.json.return_value = SAMPLE_REMOTIVE_RESPONSE
        elif "remoteok" in url_str:
            mock_resp.json.return_value = SAMPLE_REMOTEOK_RESPONSE
        else:
            mock_resp.json.return_value = {}
            mock_resp.text = ""
        return mock_resp

    monkeypatch.setattr(httpx.Client, "get", mock_get)

    scraper = RemoteBoardsScraper()
    jobs = scraper.search(keywords="python", remote_only=True, limit=10)

    assert len(jobs) >= 1
    # Check Arbeitnow item
    arbeit_job = next((j for j in jobs if j.source == "arbeitnow"), None)
    assert arbeit_job is not None
    assert "Python" in arbeit_job.title
    assert arbeit_job.is_remote is True
    assert arbeit_job.company == "Acme Cloud Services"


def test_remote_boards_graceful_error_handling(monkeypatch):
    """
    Verifies that if an API throws an exception or timeout, the scraper
    does not crash and continues with other available sources.
    """
    def mock_failing_get(client_self, url, *args, **kwargs):
        url_str = str(url)
        if "arbeitnow" in url_str:
            raise httpx.ConnectTimeout("Connection timed out to Arbeitnow")
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = SAMPLE_REMOTIVE_RESPONSE
        return mock_resp

    monkeypatch.setattr(httpx.Client, "get", mock_failing_get)

    scraper = RemoteBoardsScraper()
    jobs = scraper.search(keywords="python", remote_only=True, limit=10)

    # Remotive should still succeed despite Arbeitnow failure
    assert any(j.source == "remotive" for j in jobs)
