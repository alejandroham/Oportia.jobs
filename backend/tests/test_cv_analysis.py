"""Análisis del CV: IA al subir (con clave o IA gratuita aceptada), clasificación de títulos y cursos, y lector por secciones."""

from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.agents import profile_analyzer as pa
from app.agents.llm_provider import SharedAIConsentRequired
from app.main import app

CV = (Path(__file__).parent / "fixtures" / "cv_tecnico_construccion.txt").read_text()


def test_section_parser_reads_every_experience_title_and_course():
    p = pa.deterministic_cv_parser(CV)
    assert [e.role for e in p.experiences] == ["Supervisor de Obra", "Jefe de Terreno", "Asistente de Oficina Técnica", "Capataz de Obra"]
    assert p.experiences[0].company == "Constructora Andes Sur" and p.experiences[0].end_date == "Actual"
    assert p.experiences[2].company == "Constructora Pacífico S.A."
    assert [e.degree for e in p.education] == ["Técnico en Construcción", "Diplomado en Gestión de Proyectos de Construcción"]
    assert p.education[0].institution == "Instituto Profesional Virginio Gómez" and p.education[0].graduation_year == "2014"
    assert len(p.certifications) == 3 and p.certifications[0].startswith("Curso BIM con Revit")
    assert "AutoCAD" in p.technical_skills and "Liderazgo" in p.soft_skills
    assert p.languages == {"Español": "Nativo", "Inglés": "Básico"}
    assert p.name == "Juan Pérez Soto" and p.headline == "Técnico en Construcción"


def test_word_experiencia_in_summary_does_not_start_the_section():
    # Antes, "años de experiencia" en el resumen hacía empezar ahí la sección y mezclaba todo.
    p = pa.deterministic_cv_parser(CV)
    assert all("años de experiencia" not in e.role for e in p.experiences)


def test_ai_output_is_cleaned_courses_out_of_education_and_skills_out_of_certs():
    fake = {
        "name": "JUAN PEREZ SOTO",  # mayúsculas y sin tildes: igual debe reconocerse
        "headline": "Técnico en Construcción", "primary_profession": "Técnico en Construcción",
        "technical_skills": ["AutoCAD", "BIM"], "soft_skills": ["Liderazgo"],
        "experiences": [{"company": "Constructora Andes Sur", "role": "Supervisor de Obra", "start_date": "Marzo 2021", "end_date": "Actual",
                         "description": "Supervisión", "location": None, "technologies": [], "bullet_achievements": []}],
        "education": [{"institution": "IP Virginio Gómez", "degree": "Técnico en Construcción", "field_of_study": "Construcción", "graduation_year": "2014"},
                      {"institution": "OTEC Construye", "degree": "Curso BIM con Revit", "field_of_study": "", "graduation_year": "2022"}],
        "certifications": ["BIM", "Licencia de conducir clase B"],
    }
    with patch.object(pa, "_ai_available", return_value=True), patch.object(pa.llm, "generate_json", return_value=fake):
        profile, method, note = pa.analyze_cv(CV)
    assert method == "ia" and note is None
    assert [e.degree for e in profile.education] == ["Técnico en Construcción"]
    assert "Curso BIM con Revit — OTEC Construye" in profile.certifications
    assert "BIM" not in profile.certifications  # era una habilidad, no una certificación
    assert "Licencia de conducir clase B" in profile.certifications


def test_without_ai_consent_falls_back_with_a_clear_note():
    with patch.object(pa, "_ai_available", return_value=True), patch.object(pa.llm, "generate_json", side_effect=SharedAIConsentRequired()):
        profile, method, note = pa.analyze_cv(CV)
    assert method == "reglas" and "Reanalizar con IA" in note
    assert len(profile.experiences) == 4


def test_reanalyze_endpoint_is_stateless_and_returns_method():
    with patch.object(pa, "_ai_available", return_value=False):
        res = TestClient(app).post("/api/profile/reanalyze", json={"text": CV})
    data = res.json()
    assert res.status_code == 200 and data["method"] == "reglas"
    assert len(data["profile"]["experiences"]) == 4


def test_upload_accepts_txt_and_rejects_large_files_with_clear_message():
    from fastapi.testclient import TestClient
    from app.main import app, MAX_CV_BYTES
    from app.utils.rate_limiter import ai_rate_limiter
    ai_rate_limiter.clear()
    c = TestClient(app)
    txt = "Rosa Pérez Soto\nrosa@correo.cl | +56 9 8765 4321\nEXPERIENCIA\nSupervisora de obra - Constructora Andes\n2015 - Actual\n"
    r = c.post("/api/profile/upload", files={"file": ("cv.txt", txt.encode(), "text/plain")})
    assert r.status_code == 200, r.text
    assert r.json()["profile"]["name"] == "Rosa Pérez Soto"
    big = c.post("/api/profile/upload", files={"file": ("cv.pdf", b"0" * (MAX_CV_BYTES + 1), "application/pdf")})
    assert big.status_code == 413 and "4 MB" in big.json()["detail"]


def test_name_is_cut_before_email_when_on_the_same_line():
    from app.agents.profile_analyzer import deterministic_cv_parser
    p = deterministic_cv_parser("Rosa Pérez Soto rosa.perez@correo.cl | +56 9 8765 4321 | Maipú\nEXPERIENCIA\nSupervisora - Andes 2015 - Actual")
    assert p.name == "Rosa Pérez Soto"


def test_ai_that_runs_out_of_time_falls_back_to_rules(monkeypatch):
    """Si la IA no alcanza a responder antes del límite de Vercel, igual se cargan los datos (sin IA)."""
    from app.agents import profile_analyzer as pa
    from app.agents.llm_provider import LLMProviderError
    monkeypatch.setattr(pa, "_ai_available", lambda: True)

    def slow(*a, **k):
        raise LLMProviderError(code="timeout", message="La IA tardó demasiado", provider="gemini")

    monkeypatch.setattr(pa.llm, "generate_json", slow)
    profile, method, note = pa.analyze_cv("Rosa Pérez Soto\nrosa@correo.cl\nEXPERIENCIA\nSupervisora de obra - Constructora Andes\n2015 - Actual")
    assert method == "reglas" and profile.name == "Rosa Pérez Soto" and profile.email == "rosa@correo.cl"
