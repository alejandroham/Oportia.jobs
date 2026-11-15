"""Brechas reales (requisitos de ofertas vs. CV) y cursos para cualquier área."""
from fastapi.testclient import TestClient

from app.main import app
from app.agents.gap_analyzer import analyze_gaps
from app.agents.career_coach import career_coach
from app.agents.llm_provider import llm, AIRestingError, AINotConnectedError
from app.models.schemas import CandidateProfile, JobPosting, WorkExperience
from app.utils.rate_limiter import ai_rate_limiter

TENS = CandidateProfile(
    name="Paula", headline="TENS", primary_profession="Técnico en Enfermería",
    technical_skills=["Curaciones", "Signos vitales"],
    experiences=[WorkExperience(company="Clínica", role="TENS de Urgencia", start_date="2020",
                                description="Atención en urgencia y registro clínico de pacientes")],
)
JOBS = [
    JobPosting(id="a", title="TENS Urgencia", company="X", location="CL", is_remote=False, source="t",
               description="Requisitos: curaciones, registro clínico, curso IAAS vigente y licencia de conducir clase B."),
    JobPosting(id="b", title="TENS Hospitalización", company="Y", location="CL", is_remote=False, source="t",
               description="Curso IAAS, RCP y signos vitales."),
]


def _no_ai(monkeypatch):
    def fail(*a, **k):
        raise AINotConnectedError()
    monkeypatch.setattr(llm, "generate_json", fail)


def test_rule_based_compares_requirements_with_cv(monkeypatch):
    _no_ai(monkeypatch)
    res = analyze_gaps(TENS, JOBS)
    by = {g.requirement: g for g in res.items}
    assert res.method == "reglas" and res.jobs_analyzed == 2
    assert by["IAAS"].status == "brecha" and set(by["IAAS"].job_titles) == {"TENS Urgencia", "TENS Hospitalización"}
    assert by["Curaciones"].status == "cumple" and "Curaciones" in by["Curaciones"].evidence
    assert by["Registro clínico"].status == "cumple" and "TENS de Urgencia" in by["Registro clínico"].evidence
    assert by["Licencia de conducir clase B"].status == "brecha"
    assert "Licencia de conducir clase D" not in by  # la oferta pide clase B, no D
    # Brechas primero, la más pedida (IAAS, 2 ofertas) arriba
    assert res.items[0].requirement == "IAAS"
    # No aparecen requisitos que ninguna oferta pide
    assert "Windows Server" not in by


def test_ai_based_keeps_only_valid_items(monkeypatch):
    def fake(prompt, system_instruction=None):
        return {"requisitos": [
            {"requisito": "Curso IAAS", "estado": "brecha", "evidencia": "inventada", "ofertas": ["a", "b"], "buscar_curso": "curso IAAS"},
            {"requisito": "Urgencia", "estado": "cumple", "evidencia": "TENS de Urgencia en Clínica", "ofertas": ["a"]},
            {"requisito": "Hospitalización", "estado": "parcial", "evidencia": "Atención de pacientes en urgencia", "ofertas": ["b"]},
            {"requisito": "X", "estado": "quizas"},
        ]}
    monkeypatch.setattr(llm, "generate_json", fake)
    res = analyze_gaps(TENS, JOBS)
    assert res.method == "ia"
    assert [g.status for g in res.items] == ["brecha", "parcial", "cumple"]
    assert res.items[0].evidence is None  # una brecha nunca trae evidencia
    assert res.items[0].course_query == "curso IAAS"


def test_resting_ai_falls_back_to_rules_with_note(monkeypatch):
    def rest(*a, **k):
        raise AIRestingError("descansando")
    monkeypatch.setattr(llm, "generate_json", rest)
    res = analyze_gaps(TENS, JOBS)
    assert res.method == "reglas" and res.note == "descansando" and res.items


def test_no_jobs_gives_guidance():
    res = analyze_gaps(TENS, [])
    assert res.items == [] and "Guarda o evalúa ofertas" in res.note


def test_gaps_endpoint(monkeypatch):
    _no_ai(monkeypatch)
    ai_rate_limiter.clear()
    c = TestClient(app)
    r = c.post("/api/coach/gaps", json={"profile": TENS.model_dump(), "jobs": [j.model_dump() for j in JOBS]})
    assert r.status_code == 200, r.text
    assert any(i["requirement"] == "IAAS" for i in r.json()["items"])
    assert c.post("/api/coach/gaps", json={"profile": {"name": "Candidato"}, "jobs": []}).status_code == 400


def test_courses_never_return_unrelated_it_courses():
    res = career_coach.search_verified_courses(competency="curaciones")
    assert all(r.platform not in ("Microsoft Learn", "AWS Skill Builder") for r in res)
    platforms = {r.platform for r in res}
    assert {"SENCE y OTEC (Chile)", "ChileValora", "Coursera", "edX"} <= platforms
    assert all(not r.verified for r in res)
    assert any("coursera.org/search?query=curaciones" in r.url for r in res)
