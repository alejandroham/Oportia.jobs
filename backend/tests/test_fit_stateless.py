"""Evaluación de compatibilidad y "Ordenar ofertas con IA" en modo sin estado (Vercel)."""
from fastapi.testclient import TestClient

from app.main import app
from app.agents.llm_provider import llm
from app.utils.rate_limiter import ai_rate_limiter

JOB = {"id": "j1", "title": "TENS Urgencia", "company": "Clínica X", "location": "Valparaíso",
       "is_remote": False, "description": "TENS para urgencia", "source": "t", "tags": []}
JOB2 = {**JOB, "id": "j2", "title": "Vendedor", "description": "Ventas en tienda"}
PROFILE = {"name": "Paula", "headline": "TENS", "years_of_experience": 6,
           "technical_skills": ["Curaciones", "Signos vitales"], "soft_skills": [], "languages": {},
           "experiences": [{"id": "e1", "company": "C", "role": "TENS", "start_date": "2020", "is_remote": False,
                            "description": "Urgencia", "technologies": [], "bullet_achievements": []}],
           "education": [], "certifications": []}


def client():
    ai_rate_limiter.clear()
    return TestClient(app, raise_server_exceptions=False)


def test_evaluate_without_preferences_no_longer_500(mock_llm, isolated_db):
    r = client().post("/api/jobs/evaluate", json={"job": JOB, "profile": PROFILE})
    assert r.status_code == 200, r.text
    assert 0 <= r.json()["overall_score"] <= 100
    # Sin estado: nada de la evaluación (que cita el CV) queda en el servidor.
    assert isolated_db.get_evaluation("j1") is None
    assert isolated_db.get_jobs() == []


def test_rank_jobs_single_ai_call(monkeypatch):
    calls = []

    def fake_json(prompt, system_instruction=None):
        calls.append(prompt)
        return {"ranking": [
            {"id": "j1", "fit_score": 91, "razon": "Experiencia directa en urgencia"},
            {"id": "j2", "fit_score": "35", "razon": "Área distinta"},
            {"id": "inventada", "fit_score": 99},
        ]}

    monkeypatch.setattr(llm, "generate_json", fake_json)
    r = client().post("/api/jobs/rank", json={"jobs": [JOB, JOB2], "profile": PROFILE})
    assert r.status_code == 200, r.text
    results = {x["job_id"]: x["fit_score"] for x in r.json()["results"]}
    assert results == {"j1": 91, "j2": 35}  # ids desconocidos se descartan, textos se convierten
    assert len(calls) == 1


def test_rank_jobs_requires_cv():
    r = client().post("/api/jobs/rank", json={"jobs": [JOB], "profile": {"name": "Candidato"}})
    assert r.status_code == 400
    assert "sube tu CV" in r.json()["detail"]


def test_rank_jobs_caps_batch_size(monkeypatch):
    seen = {}

    def fake_json(prompt, system_instruction=None):
        seen["n"] = prompt.count('"id": "j')
        return {"ranking": []}

    monkeypatch.setattr(llm, "generate_json", fake_json)
    jobs = [{**JOB, "id": f"j{i}"} for i in range(40)]
    assert client().post("/api/jobs/rank", json={"jobs": jobs, "profile": PROFILE}).status_code == 200
    assert seen["n"] == 15
