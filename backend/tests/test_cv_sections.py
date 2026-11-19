"""Lectura del CV: títulos, cursos, habilidades, idiomas y palabras clave separados (con y sin IA)."""

from app.agents.profile_analyzer import _profile_from_ai, deterministic_cv_parser, parse_languages

CANVA_CV = """Ana Rojas Pérez
ana@correo.cl | +56 9 1111 2222
P E R F I L
Ingeniera en informática con 8 años.
EXPERIENCIA LABORAL
Desarrolladora Full Stack - Prisat
Febrero 2021 - Actual
• Desarrollé el ERP Ágora
HABILIDADES: Python, React, SQL Server · Docker / Git - Scrum
Liderazgo, Trabajo en equipo
EDUCACIÓN Ingeniero en Informática - Universidad de Concepción 2015
Técnico en Programación – INACAP (2010)
CURSOS Y CERTIFICACIONES
• Curso Scrum Master, 40 horas - Udemy 2020
• Certificación AWS Cloud Practitioner 2022
IDIOMAS: Inglés intermedio (B1) · Español nativo
"""

MIXED_CV = """Luis Soto
EDUCACIÓN Y CERTIFICACIONES
Ingeniero en Informática
Universidad de Concepción 2015
Diplomado en Gestión de Proyectos - Universidad del Bío-Bío 2018
Bootcamp Desarrollo Web Full Stack (480 horas)
Desafío Latam 2019
Certificación AWS Cloud Practitioner 2022
"""


def test_inline_and_spaced_headings_and_lists_are_split():
    p = deterministic_cv_parser(CANVA_CV)
    assert p.technical_skills == ["Python", "React", "SQL Server", "Docker", "Git", "Scrum"]
    assert p.soft_skills == ["Liderazgo", "Trabajo en equipo"]
    assert p.languages == {"Inglés": "Intermedio", "Español": "Nativo"}
    assert p.keywords[:3] == ["Python", "React", "SQL Server"]
    assert [(e.degree, e.institution, e.graduation_year) for e in p.education] == [
        ("Ingeniero en Informática", "Universidad de Concepción", "2015"), ("Técnico en Programación", "INACAP", "2010")]
    assert p.certifications == ["Certificación AWS Cloud Practitioner 2022", "Curso Scrum Master, 40 horas - Udemy 2020"]  # más reciente primero
    assert "Ingeniera en informática con 8 años." in p.summary


def test_mixed_education_section_separates_degrees_and_courses():
    p = deterministic_cv_parser(MIXED_CV)
    assert [e.degree for e in p.education] == ["Ingeniero en Informática", "Diplomado en Gestión de Proyectos"]
    assert p.education[0].institution == "Universidad de Concepción" and p.education[0].graduation_year == "2015"
    assert p.certifications == ["Certificación AWS Cloud Practitioner 2022", "Bootcamp Desarrollo Web Full Stack (480 horas) — Desafío Latam 2019"]


def test_ai_lists_that_come_as_text_are_split_instead_of_failing():
    ai = {"name": "Ana Rojas", "technical_skills": "Python, React, SQL", "soft_skills": ["Liderazgo; Comunicación"],
          "languages": ["Inglés: intermedio", "Español nativo"],
          "certifications": "Curso Scrum (40 horas) 2020; AWS Cloud Practitioner 2022",
          "education": {"degree": "Ingeniero en Informática", "institution": "UdeC", "graduation_year": "2015"},
          "experiences": [{"company": "Prisat", "role": "Dev", "start_date": "2021", "technologies": "Python, React", "bullet_achievements": "Logro 1\nLogro 2"}]}
    p = _profile_from_ai(ai, "Ana Rojas")
    assert p.technical_skills == ["Python", "React", "SQL"] and p.soft_skills == ["Liderazgo", "Comunicación"]
    assert p.languages == {"Inglés": "Intermedio", "Español": "Nativo"}
    assert p.certifications == ["AWS Cloud Practitioner 2022", "Curso Scrum (40 horas) 2020"]
    assert p.education[0].degree == "Ingeniero en Informática"
    assert p.experiences[0].technologies == ["Python", "React"] and p.experiences[0].bullet_achievements == ["Logro 1", "Logro 2"]
    assert p.keywords == ["Python", "React", "SQL"]


def test_languages_from_many_formats():
    assert parse_languages({"inglés": "b2"}) == {"Inglés": "B2"}
    assert parse_languages("Inglés (B2), Portugués básico") == {"Inglés": "B2", "Portugués": "Básico"}
    assert parse_languages(["English - Advanced"]) == {"English": "Advanced"}


def test_two_column_pdf_with_sidebar_first():
    """PDF real de dos columnas (barra lateral con contacto, habilidades e idiomas primero)."""
    from pathlib import Path
    from app.agents.profile_analyzer import extract_text_from_file
    p = deterministic_cv_parser(extract_text_from_file(Path(__file__).parent / "fixtures" / "cv_dos_columnas.pdf"))
    assert p.name == "Ana Rojas Pérez" and p.headline == "Desarrolladora Full Stack"
    assert p.email == "ana@correo.cl" and p.technical_skills == ["Python", "React", "SQL Server", "Docker"]
    assert p.languages == {"Inglés": "Intermedio", "Español": "Nativo"}
    assert [e.degree for e in p.education] == ["Ingeniero en Informática", "Técnico en Programación"]
    assert len(p.certifications) == 2 and p.experiences[0].company == "Prisat"


# Formato de un CV generado por Oportia antes de la 1.6.0 (palabras partidas con guion, fecha | lugar | descripción
# en la misma línea, "Herramientas:" partida, "Experiencia anterior" en una línea por cargo). Datos ficticios.
OPORTIA_OLD_PDF_TEXT = """Paula Rivas Muñoz
Ingeniera en Informática | Gestión TI | Microsoft 365 |
Desarrollo de Soluciones paula@correo.cl · +56 9 1234 5678 · Concepción, Región del Biobío
PERFIL PROFESIONAL
Ingeniera en Informática con experiencia en gestión de tecnologías de la información y trans-
formación digital.
COMPETENCIAS
Gestión de servicios de TI · Adminis-
tración de Microsoft 365 · Bases de datos (MySQL · SQL
Server) · AutoCAD
EXPERIENCIA LABORAL
Encargada Corporativa de Informática — Centro de Formación Técnica Estatal de la Región del
Biobío
Enero 2026 – Octubre 2026 | San Pedro de la Paz, Región del Biobío, Chile Responsable del área de TI para tres sedes. Liderazgo del equipo TI y administración de Microsoft 365. Herramientas: Microsoft 365, Moodle, Servi-
dores, Redes
Desarrolladora Freelance — Estudio Ficticio
Octubre 2025 – Actual | San Pedro de la paz Liderar el diseño de una plataforma web. Implementé integraciones con servicios externos. Herramientas: Hardware,
Servicios Web
Asistente de Oficina Técnica — Constructora Ejemplo S.A.
Marzo 2018 – Abril 2019 | Coquimbo, Chile Cubicaciones y estados de pago.
EXPERIENCIA ANTERIOR
Analista de Control – Servicios Ejemplo · HOLDTECH (Julio 2017 – Febrero 2018)
Auxiliar Administrativo / Cajera · Consorcio Ejemplo de Seguros
(Marzo 2012 – Julio 2012)
EDUCACIÓN
Ingeniero en Informática en Ingenieria en informática, Universidad Tecnológica de Chile, INACAP
(2015)
Desarrolladora Full Stack JavaScript, Desafío Latam (2026)
"""


def test_cv_generated_by_old_oportia_reads_every_section():
    import re
    text = re.sub(r"([a-záéíóúñü])-\n([a-záéíóúñü])", r"\1\2", OPORTIA_OLD_PDF_TEXT)  # como extract_text_from_file
    p = deterministic_cv_parser(text)
    assert p.name == "Paula Rivas Muñoz"
    assert p.headline == "Ingeniera en Informática | Gestión TI | Microsoft 365 | Desarrollo de Soluciones"
    assert "transformación digital" in p.summary
    assert p.technical_skills == ["Gestión de servicios de TI", "Administración de Microsoft 365", "Bases de datos (MySQL · SQL Server)", "AutoCAD"]
    exps = [(e.role, e.company, e.start_date, e.end_date, e.location) for e in p.experiences]
    assert exps[0] == ("Encargada Corporativa de Informática", "Centro de Formación Técnica Estatal de la Región del Biobío",
                       "Enero 2026", "Octubre 2026", "San Pedro de la Paz, Región del Biobío, Chile")
    assert exps[1][:2] == ("Desarrolladora Freelance", "Estudio Ficticio") and exps[1][4] == "San Pedro de la paz"
    assert exps[2][1] == "Constructora Ejemplo S.A."
    assert p.experiences[0].technologies == ["Microsoft 365", "Moodle", "Servidores", "Redes"]
    assert p.experiences[1].technologies == ["Hardware", "Servicios Web"]
    assert p.experiences[0].description.startswith("Responsable del área de TI")
    assert ("Analista de Control – Servicios Ejemplo", "HOLDTECH") in [(e.role, e.company) for e in p.experiences]
    assert ("Auxiliar Administrativo / Cajera", "Consorcio Ejemplo de Seguros") in [(e.role, e.company) for e in p.experiences]
    assert [(e.degree, e.institution, e.graduation_year) for e in p.education] == [
        ("Ingeniero en Informática", "Universidad Tecnológica de Chile, INACAP", "2015"),
        ("Desarrolladora Full Stack JavaScript", "Desafío Latam", "2026")]
