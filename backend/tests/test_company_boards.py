"""Etapa E: ofertas directas desde las API públicas de portales de empleo de empresas (sin red)."""

from datetime import datetime, timezone

from app.indexer.build import is_current
from app.scrapers import company_boards as cb


class Resp:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        pass

    def json(self):
        return self._data


def fake_get(responses):
    def _get(url, params=None, headers=None, timeout=None):
        for key, data in responses.items():
            if key in url:
                return Resp(data)
        raise AssertionError(f"URL inesperada: {url}")
    return _get


def test_each_ats_keeps_only_chile_or_latam(monkeypatch):
    monkeypatch.setattr(cb.requests, "get", fake_get({
        "greenhouse.io": {"jobs": [
            {"title": "Analista Contable", "absolute_url": "https://gh/1", "location": {"name": "Santiago"}, "content": "&lt;p&gt;Hola &amp;amp; chao&lt;/p&gt;"},
            {"title": "Engineer", "absolute_url": "https://gh/2", "location": {"name": "Madrid, Spain"}, "content": ""},
        ]},
        "lever.co": [
            {"text": "Account Executive", "hostedUrl": "https://lv/1", "categories": {"location": "Remote - LATAM", "commitment": "Full-time"},
             "workplaceType": "remote", "createdAt": 1762000000000, "descriptionPlain": "Ventas B2B"},
            {"text": "SDR", "hostedUrl": "https://lv/2", "categories": {"location": "Mexico City"}, "descriptionPlain": ""},
        ],
        "ashbyhq.com": {"jobs": [
            {"title": "Software Engineer", "jobUrl": "https://ab/1", "location": "Bogotá", "secondaryLocations": [{"location": "Chile"}],
             "descriptionPlain": "Python", "isRemote": False, "publishedAt": "2025-08-13T00:00:00Z"},
        ]},
        "smartrecruiters.com": {"totalFound": 1, "content": [
            {"id": "77", "name": "BODEGUERO", "location": {"city": "Vitacura", "region": "RM", "remote": False},
             "department": {"label": "Operaciones"}, "typeOfEmployment": {"label": "Full-time"}, "releasedDate": "2026-11-04T15:24:24Z"},
        ]},
    }))
    boards = [
        {"ats": "greenhouse", "token": "x", "name": "GH SA"},
        {"ats": "lever", "token": "x", "name": "LV SpA"},
        {"ats": "ashby", "token": "x", "name": "AB"},
        {"ats": "smartrecruiters", "token": "Acme", "name": "Acme"},
    ]
    res = cb.fetch_company_boards(boards)
    assert [j.title for j in res["GH SA"]] == ["Analista Contable"]
    assert res["GH SA"][0].description == "Hola & chao"
    assert [j.title for j in res["LV SpA"]] == ["Account Executive"]
    assert res["LV SpA"][0].is_remote and res["LV SpA"][0].posted_at.startswith("2025-11")
    assert res["AB"][0].location == "Bogotá / Chile"
    sr = res["Acme"][0]
    assert sr.url == "https://jobs.smartrecruiters.com/Acme/77"
    assert sr.location == "Vitacura, RM, Chile" and sr.source == "smartrecruiters"
    assert sr.company == "Acme" and "Portal de la empresa" in sr.tags


def test_a_failing_company_does_not_stop_the_rest(monkeypatch):
    def boom(*a, **k):
        raise TimeoutError("sin respuesta")
    monkeypatch.setattr(cb.requests, "get", boom)
    assert cb.fetch_company_boards([{"ats": "lever", "token": "x", "name": "X"}]) == {"X": []}


def test_company_board_offers_stay_current_while_published():
    from app.models.schemas import JobPosting
    now = datetime(2026, 11, 17, tzinfo=timezone.utc)
    old = dict(title="Account Executive", company="X", description="", posted_at="2024-09-03T00:00:00Z")
    assert is_current(JobPosting(source="lever", **old), now) is True
    assert is_current(JobPosting(source="computrabajo", **old), now) is False
