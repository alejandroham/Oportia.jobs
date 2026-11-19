"""El CV adaptado no puede traer nada que no esté en el perfil: lo inventado se quita y se avisa."""

from fastapi.testclient import TestClient

from app.agents.cv_fidelity import verify_cv, verify_letter
from app.agents.llm_provider import llm
from app.main import app
from app.models.schemas import CandidateProfile
from app.utils.rate_limiter import ai_rate_limiter

PROFILE = CandidateProfile(**{
    "name": "Rosa Pérez", "email": "rosa@correo.cl", "phone": "+56 9 8765 4321", "headline": "Supervisora de obra",
    "years_of_experience": 0, "technical_skills": ["Lectura de planos", "AutoCAD"], "soft_skills": ["Liderazgo"],
    "experiences": [
        {"id": "e1", "company": "Constructora Andes", "role": "Supervisora de obra", "start_date": "2015", "end_date": "Actual",
         "description": "Coordiné cuadrillas de 25 personas en edificación.", "technologies": [], "bullet_achievements": ["Reduje atrasos en 15 %"]},
    ],
    "education": [{"institution": "Duoc UC", "degree": "Técnico", "field_of_study": "Construcción", "graduation_year": "2011"}],
    "certifications": ["Curso de prevención de riesgos"],
})

AI_CV = """# {{NOMBRE}}
## Perfil profesional
Supervisora con más de 10 años en edificación. Aumenté la productividad en 40 % en todas mis obras.
## Competencias
Lectura de planos · AutoCAD · SAP · Liderazgo · Revit
## Experiencia laboral
### Supervisora de obra · Constructora Andes (2015 – actualidad)
- Coordiné cuadrillas de 25 personas en edificación.
- Reduje atrasos en 15 %.
- Ahorré $50.000.000 en materiales.
### Gerente de proyectos · Inmobiliaria Inventada (2010 – 2014)
- Dirigí 3 torres.
## Educación
- Técnico en Construcción, Duoc UC (2011)
- Magíster en Administración, Universidad Ficticia (2019)
- Curso de prevención de riesgos
"""


def test_removes_invented_figures_experiences_studies_and_skills():
    clean, removed = verify_cv(AI_CV, PROFILE)
    # Se mantiene lo real (incluidas cifras del perfil y años calculables con las fechas: 2015 -> hoy = más de 10).
    for real in ("Coordiné cuadrillas de 25 personas", "Reduje atrasos en 15 %", "Constructora Andes (2015 – actualidad)",
                 "Duoc UC (2011)", "Curso de prevención de riesgos", "más de 10 años", "Lectura de planos · AutoCAD · Liderazgo"):
        assert real in clean, real
    # Se quita lo inventado.
    for fake in ("40 %", "$50.000.000", "Inmobiliaria Inventada", "Dirigí 3 torres", "Magíster", "SAP", "Revit"):
        assert fake not in clean, fake
    text = " ".join(removed)
    assert "40 %" in text and "Inmobiliaria Inventada" in text and "Magíster" in text and "SAP" in text


def test_letter_drops_only_sentences_with_invented_figures():
    letter = "Estimado equipo:\n\nCoordiné cuadrillas de 25 personas. Además aumenté las ventas en 300 %.\n\nAtentamente,\nRosa"
    clean, removed = verify_letter(letter, PROFILE)
    assert "25 personas" in clean and "300 %" not in clean and "Atentamente" in clean
    assert len(removed) == 1


def test_draft_retries_once_and_reports_what_was_removed(monkeypatch):
    calls = {"json": 0, "text": 0}

    def fake_json(prompt, system_instruction=None):
        calls["json"] += 1
        if "tailored_cv_markdown" in prompt:
            return {"tailored_cv_markdown": AI_CV, "cover_letter": "Estimado equipo:\n\nLogré 99 premios.\n\nAtentamente,\n{{NOMBRE}}"}
        return {"ats_score": 80, "ats_feedback": [], "reviewer_critique": "ok"}

    def fake_text(prompt, system_instruction=None, provider=None):
        calls["text"] += 1
        assert "CORRECCIÓN OBLIGATORIA" in prompt and "Inmobiliaria Inventada" in prompt
        return "# {{NOMBRE}}\n## Experiencia laboral\n### Supervisora de obra · Constructora Andes\n- Reduje atrasos en 15 %.\n## Educación\n- Técnico en Construcción, Duoc UC (2011)"

    monkeypatch.setattr(llm, "generate_json", fake_json)
    monkeypatch.setattr(llm, "generate_text", fake_text)
    ai_rate_limiter.clear()
    r = TestClient(app).post("/api/applications/draft", json={
        "job": {"id": "j", "title": "Supervisor", "company": "X", "location": "Santiago", "is_remote": False, "description": "x", "source": "t", "tags": []},
        "profile": PROFILE.model_dump(), "cv_options": {"length": "full"}})
    assert r.status_code == 200, r.text
    d = r.json()
    assert calls["text"] == 1  # un solo reintento
    md = d["tailored_cv_markdown"]
    assert "Inventada" not in md and "Reduje atrasos en 15 %" in md
    assert "rosa@correo.cl" in md and "+56 9 8765 4321" in md  # correo y teléfono siempre en el CV adaptado
    assert "99 premios" not in d["cover_letter"]
    assert any("99" in w for w in d["fidelity_warnings"])
