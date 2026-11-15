"""
Modo sin estado (Vercel): el servidor no debe leer, devolver ni guardar datos personales en disco.
Cada test deja en el disco datos de "otra persona" y comprueba que no se filtren.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.models.schemas import CandidateProfile, UserPreferences, CompetencyDiagnosticItem, LearningPath
from app.utils.rate_limiter import ai_rate_limiter


@pytest.fixture
def stateless(monkeypatch, isolated_db):
    monkeypatch.setattr(settings, "STATELESS", True)
    ai_rate_limiter.clear()
    # Datos de OTRA persona en el disco del servidor
    isolated_db.save_profile(CandidateProfile(name="Otra Persona", headline="Abogada", technical_skills=["Litigación"]))
    isolated_db.save_preferences(UserPreferences(auto_learned_insights=["SECRETO de otra persona"]))
    isolated_db.save_competencies([CompetencyDiagnosticItem(name="Litigación", category="Técnica")])
    isolated_db.save_learning_path(LearningPath(title="Ruta de otra persona", target_role="Abogada", overview="x"))
    return isolated_db


def c():
    return TestClient(app, raise_server_exceptions=False)


ME = {"name": "Paula", "headline": "TENS", "years_of_experience": 6, "technical_skills": ["Curaciones"],
      "soft_skills": [], "languages": {}, "experiences": [], "education": [], "certifications": []}


def test_diagnostic_never_returns_other_persons_competencies(stateless):
    assert c().get("/api/coach/diagnostic").json() == []
    r = c().post("/api/coach/diagnostic", json={"profile": ME}).json()
    names = [x["name"] for x in r]
    assert "Curaciones" in names and "Litigación" not in names
    assert [x.name for x in stateless.get_competencies()] == ["Litigación"]  # no se sobrescribió


def test_learning_paths_not_shared(stateless):
    assert c().get("/api/coach/learning-paths").json() == []


def test_legacy_export_disabled(stateless):
    assert c().get("/api/legacy-export").json() == {"found": False}


def test_memory_chat_does_not_read_or_write_server_preferences(stateless, mock_llm):
    r = c().post("/api/memory/chat", json={"message": "Hola Opi", "history": []}, headers={"X-LLM-Key": "clave-de-prueba"})
    assert r.status_code == 200, r.text
    assert "SECRETO de otra persona" not in r.text
    assert stateless.get_preferences().auto_learned_insights == ["SECRETO de otra persona"]


def test_import_url_does_not_save_job(stateless, monkeypatch):
    import app.main as m
    monkeypatch.setattr(m, "extract_job_from_url", lambda url: {"title": "Oferta", "company": "X", "location": "CL", "description": "d"})
    before = len(stateless.get_jobs())
    r = c().post("/api/jobs/import-url", json={"url": "https://example.com/oferta"})
    assert r.status_code == 200, r.text
    assert len(stateless.get_jobs()) == before
