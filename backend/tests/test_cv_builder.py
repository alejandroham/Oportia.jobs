"""Formato ATS del CV adaptado: lo arma Oportia con los hechos del perfil."""

from app.agents import cv_builder as cb
from app.models.schemas import CandidateProfile, EducationItem, JobPosting, WorkExperience


def exp(**kw):
    base = {"id": "e1", "company": "Prisat", "role": "Desarrollador Full Stack", "start_date": "02/2021", "end_date": "Actual",
            "location": "San Pedro de la Paz, Biobío", "is_remote": False, "description": "Desarrollo de sistemas.",
            "technologies": [], "bullet_achievements": []}
    base.update(kw)
    return WorkExperience(**base)


def test_dates_are_uniform_with_full_month_and_actual():
    assert cb.format_period(exp(start_date="03/2023", end_date="11/2024")) == "Marzo 2023 – Noviembre 2024"
    assert cb.format_period(exp(start_date="Oct. 2026", end_date="Present")) == "Octubre 2026 – Actual"
    assert cb.format_period(exp(start_date="2019 – 2021", end_date="")) == "2019 – 2021"
    assert cb.format_period(exp(start_date="2021-07", end_date="actualidad")) == "Julio 2021 – Actual"


def test_education_without_redundancy():
    ed = EducationItem(institution="Universidad X", degree="Ingeniero en Informática", field_of_study="Ingeniería en informática", graduation_year="2015")
    assert cb.format_education(ed) == "Ingeniero en Informática – Universidad X (2015)"
    ed2 = EducationItem(institution="Duoc UC", degree="Técnico de Nivel Superior", field_of_study="Construcción", graduation_year="2011")
    assert cb.format_education(ed2) == "Técnico de Nivel Superior en Construcción – Duoc UC (2011)"


def test_each_job_has_one_thing_per_line_and_backed_technologies():
    profile = CandidateProfile(name="Ana", technical_skills=["Python", "React", "PostgreSQL"], languages={"Español": "Nativo", "Inglés": "Intermedio"},
                               experiences=[exp(technologies=["Python", "React", "Docker"], description="Desarrollé el ERP Ágora con Python y React.")],
                               education=[], certifications=["Bootcamp de Datos (120 horas)"])
    job = JobPosting(title="Desarrollador Python", company="X", location="Concepción", is_remote=False, description="Buscamos Python, React y Kubernetes", source="t", tags=[])
    ai = {"perfil": "Desarrollador con 5 años.", "competencias": ["Python", "Kubernetes"],
          "experiencias": [{"id": "e1", "descripcion": "Desarrollo de sistemas de gestión.",
                            "logros": ["Diseñé e implementé el ERP Ágora", "Integré Mercado Público", "Automaticé reportes"],
                            "tecnologias": ["Python", "TypeScript", "RAG", "Microservices"]}]}
    md = cb.build_cv_markdown(profile, ai, job)
    lines = [l for l in md.split("\n")]
    i = lines.index("### Desarrollador Full Stack — Prisat")
    assert lines[i + 1] == "Febrero 2021 – Actual | San Pedro de la Paz, Biobío"  # fecha en su propia línea
    assert "- Diseñé e implementé el ERP Ágora" in md
    tech = next(l for l in lines if l.startswith("Tecnologías:"))
    assert tech == "Tecnologías: Python, React, Docker"  # sin TypeScript, RAG ni Microservices (no respaldados); las de la oferta primero
    assert "Kubernetes" not in md  # competencia que pide la oferta pero la persona no tiene
    for section in ("## Perfil profesional", "## Competencias", "## Experiencia laboral", "## Certificaciones y cursos", "## Idiomas"):
        assert section in md
    assert "Español: Nativo · Inglés: Intermedio" in md and "Bootcamp de Datos (120 horas)" in md


def test_soft_hyphens_are_removed():
    assert cb.clean_text("trans­formación Adminis‐tración") == "transformación Adminis-tración"


def test_keyword_match_counts_only_what_the_person_has():
    profile = CandidateProfile(name="Ana", technical_skills=["Python", "Lectura de planos"], experiences=[exp()])
    m = cb.keyword_match(["Python", "Kubernetes", "lectura de planos", "Liderazgo"], profile)
    assert m["present"] == ["Python", "lectura de planos"] and m["missing"] == ["Kubernetes", "Liderazgo"] and m["score"] == 50


def test_third_person_detection():
    assert cb.is_third_person("Cuenta además con experiencia en obras.")
    assert not cb.is_third_person("Supervisora de obra con 10 años de experiencia.")
