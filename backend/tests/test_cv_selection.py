"""CV adaptado más corto: elegir experiencias, largo del CV y 'Experiencia anterior' sin inventar."""

from fastapi.testclient import TestClient

from app.agents import cv_selection as cs
from app.agents.llm_provider import llm
from app.main import app
from app.models.schemas import CandidateProfile, JobPosting
from app.utils.rate_limiter import ai_rate_limiter


def exp(i, role, company, desc, start, end="2020"):
    return {"id": f"e{i}", "company": company, "role": role, "start_date": start, "end_date": end, "is_remote": False,
            "description": desc, "technologies": [], "bullet_achievements": [f"Logro {n}" for n in range(6)]}


PROFILE = CandidateProfile(**{
    "name": "Rosa Pérez", "headline": "Supervisora de obra", "technical_skills": ["Lectura de planos"],
    "experiences": [
        exp(1, "Supervisora de obra", "Constructora Andes", "Supervisión de cuadrillas en edificación", "2022", "Present"),
        exp(2, "Vendedora", "Tienda Sur", "Atención de clientes y caja", "2020", "2022"),
        exp(3, "Jefa de terreno", "Inmobiliaria Mar", "Control de avance de obra y planos", "2017", "2020"),
        exp(4, "Cajera", "Supermercado Uno", "Caja y reposición", "2015", "2017"),
        exp(5, "Ayudante de obra", "Constructora Norte", "Apoyo en obra gruesa y planos", "2012", "2015"),
    ],
    "education": [{"institution": "Duoc UC", "degree": "Técnico", "field_of_study": "Construcción"}],
})
JOB = JobPosting(title="Supervisor de obra", company="Constructora X", location="Santiago", is_remote=False,
                 description="Buscamos supervisor de obra con manejo de cuadrillas, lectura de planos y control de avance.",
                 source="t", tags=[])


def test_rules_pick_relevant_experiences_in_cv_order():
    ids, reasons, = cs.rule_based_selection(PROFILE, JOB, 3)[0:2]
    assert ids == ["e1", "e3", "e5"]
    assert set(reasons) == set(ids) and all(reasons.values())


def test_manual_selection_and_all_when_few():
    ids, _, method = cs.choose_experiences(PROFILE, JOB, "1", manual_ids=["e4", "e2"], use_ai=False)
    assert ids == ["e2", "e4"] and method == "manual"  # orden del CV, no el del clic
    ids, _, method = cs.choose_experiences(PROFILE, JOB, "full", use_ai=False)
    assert len(ids) == 5 and method == "todas"


def test_ai_selection_ignores_invented_ids(monkeypatch):
    monkeypatch.setattr(llm, "generate_json", lambda p, system_instruction=None: {"elegidas": [
        {"id": "e3", "razon": "Controló avance de obra"}, {"id": "falsa", "razon": "x"}, {"id": "e1", "razon": "Mismo cargo"}]})
    ids, reasons, method = cs.choose_experiences(PROFILE, JOB, "1")
    assert method == "ia" and ids == ["e1", "e3"] and reasons["e3"] == "Controló avance de obra"


def test_split_trims_bullets_and_previous_section_is_written_by_server():
    focused, others = cs.split_profile(PROFILE, ["e1", "e3"], "1")
    assert [e.id for e in focused.experiences] == ["e1", "e3"]
    assert all(len(e.bullet_achievements) == 3 for e in focused.experiences)
    md = "# Rosa\n## Experiencia\n### Supervisora\n- Logro\n## Experiencia anterior\n- Inventada · Nada\n## Educación\n- Técnico"
    out = cs.insert_previous_experience(md, others)
    assert "Inventada" not in out
    assert out.index("## Experiencia anterior") < out.index("## Educación")
    assert "**Vendedora** · Tienda Sur (2020 – 2022)" in out and "**Cajera** · Supermercado Uno" in out


def test_draft_endpoint_returns_selection_and_respects_length(monkeypatch):
    prompts = []

    def fake_json(prompt, system_instruction=None):
        prompts.append(prompt)
        if "elegidas" in prompt:
            return {"elegidas": [{"id": "e1", "razon": "Mismo cargo"}, {"id": "e3", "razon": "Obra"}, {"id": "e5", "razon": "Obra"}]}
        if "tailored_cv_markdown" in prompt:
            return {"tailored_cv_markdown": "# Rosa Pérez\n## Experiencia\n### Supervisora de obra\n- Lideré cuadrillas\n## Educación\n- Técnico",
                    "cover_letter": "Estimado equipo..."}
        return {"ats_score": 80, "ats_feedback": [], "reviewer_critique": "ok"}

    monkeypatch.setattr(llm, "generate_json", fake_json)
    ai_rate_limiter.clear()
    r = TestClient(app).post("/api/applications/draft", json={
        "job": JOB.model_dump(), "profile": PROFILE.model_dump(), "cv_options": {"length": "1"}})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["cv_length"] == "1" and d["selection_method"] == "ia"
    assert d["selected_experience_ids"] == ["e1", "e3", "e5"]
    draft_prompt = next(p for p in prompts if "tailored_cv_markdown" in p)
    assert "UNA hoja A4" in draft_prompt and "Tienda Sur" not in draft_prompt  # solo las elegidas
    assert "## Experiencia anterior" in d["tailored_cv_markdown"] and "Tienda Sur" in d["tailored_cv_markdown"]


def test_draft_prompt_asks_to_keep_profile_order(monkeypatch):
    prompts = []

    def fake_json(prompt, system_instruction=None):
        prompts.append(prompt)
        if "tailored_cv_markdown" in prompt:
            return {"tailored_cv_markdown": "# Rosa\n## Experiencia\n- x", "cover_letter": "Hola"}
        return {"ats_score": 80, "ats_feedback": [], "reviewer_critique": "ok"}

    monkeypatch.setattr(llm, "generate_json", fake_json)
    ai_rate_limiter.clear()
    r = TestClient(app).post("/api/applications/draft", json={
        "job": JOB.model_dump(), "profile": PROFILE.model_dump(), "cv_options": {"length": "full"}})
    assert r.status_code == 200, r.text
    draft_prompt = next(p for p in prompts if "tailored_cv_markdown" in p)
    assert "EXACTAMENTE en el orden" in draft_prompt
    # El perfil llega en el orden del navegador (la más reciente primero).
    assert draft_prompt.index("Constructora Andes") < draft_prompt.index("Constructora Norte")
