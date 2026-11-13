"""
Acceptance Test Suite for Universal Profession Engine & Geographic Radar
Validates all requirements from REGLAS DE NEGOCIO — OPORTIA JOBS IA
Section 6: 5 acceptance profiles (TENS, Arquitecto, Abogado, Profesor, Desarrollador)
Migrated to Pytest for offline and isolated verification.
"""

import pytest
from app.agents.profile_analyzer import deterministic_cv_parser
from app.utils.chile_regions import detect_region_and_commune, calculate_geographic_priority
from app.models.schemas import CandidateProfile, JobPosting, UserPreferences

ACCEPTANCE_PROFILES = [
    {
        "role_expected": "Técnico de Nivel Superior en Enfermería",
        "category": "Salud",
        "region_expected": "Región del Biobío",
        "commune_expected": "Concepción",
        "cv_text": """
        MARÍA JOSÉ PÉREZ VALENZUELA
        Técnico de Nivel Superior en Enfermería (TENS)
        Email: maria.perez@salud.cl | Teléfono: +56 9 8765 4321
        Ubicación: Concepción, Región del Biobío, Chile

        RESUMEN PROFESIONAL
        Técnico en Enfermería de Nivel Superior con 4 años de experiencia en servicios de urgencia y hospitalización médico-quirúrgica. Manejo de pacientes críticos, administración segura de fármacos endovenosos según indicación médica, control estricto de signos vitales y esterilización hospitalaria.

        EXPERIENCIA LABORAL
        Hospital Clínico Regional de Concepción | TENS Hospitalización
        Marzo 2021 – Presente | Concepción, Biobío
        - Asistencia directa a 15+ pacientes diarios en sala de medicina.
        - Administración de tratamiento farmacológico y curaciones simples y complejas.
        - Registro diario en Ficha Clínica Electrónica (RCE).

        EDUCACIÓN
        Instituto Profesional Duoc UC | Técnico de Nivel Superior en Enfermería (TENS) (2018 - 2020)
        Certificación en Reanimación Cardiopulmonar (RCP) y Manejo de IAAS (80 hrs).
        """
    },
    {
        "role_expected": "Arquitecto",
        "category": "Construcción y Arquitectura",
        "region_expected": "Región de La Araucanía",
        "commune_expected": "Temuco",
        "cv_text": """
        FELIPE IGNACIO MORALES CASTRO
        Arquitecto - Gestión de Proyectos y BIM
        felipe.morales@arq.cl | +56 9 9123 4567 | Temuco, Región de La Araucanía

        PERFIL
        Arquitecto titulado con 6 años de experiencia en diseño arquitectónico sustentable, modelado BIM (Revit) y coordinación de obras habitacionales y comerciales. Dominio de normativa OGUC y tramitación municipal.

        EXPERIENCIA
        Constructora del Sur SpA | Arquitecto Coordinador BIM
        Enero 2019 – Presente | Temuco, La Araucanía
        - Liderazgo en modelado y coordinación BIM de 4 conjuntos residenciales.
        - Elaboración de expedientes de edificación ante la DOM de Temuco y Padre Las Casas.

        EDUCACIÓN
        Universidad de La Frontera (UFRO) | Arquitectura (2012 - 2018)
        Diplomado en Metodología BIM y Revit Architecture (2020)
        """
    },
    {
        "role_expected": "Abogado",
        "category": "Derecho y Legal",
        "region_expected": "Región Metropolitana de Santiago",
        "commune_expected": "Santiago",
        "cv_text": """
        VALENTINA PAZ SILVA HENRÍQUEZ
        Abogada - Derecho Laboral y Corporativo
        valentina.silva@abogados.cl | +56 9 7654 3210 | Santiago, Región Metropolitana

        RESUMEN
        Abogada habilitada por la Excma. Corte Suprema con 5 años de trayectoria en litigación laboral, redacción de contratos colectivos y asesoría en compliance normativo.

        EXPERIENCIA
        Estudio Juriddico Silva & Asociados | Abogada Senior Litigios
        Julio 2020 – Presente | Las Condes, Santiago, Región Metropolitana
        - Representación judicial ante Juzgados de Letras del Trabajo y Corte de Apelaciones de Santiago.
        - Redacción de más de 120 dictámenes laborales y contratos comerciales.

        EDUCACIÓN
        Universidad de Chile | Licenciada en Ciencias Jurídicas y Sociales (2013 - 2018)
        Título de Abogada otorgado por la Corte Suprema de Chile (2019)
        """
    },
    {
        "role_expected": "Profesor de Educación Básica",
        "category": "Educación",
        "region_expected": "Región de Ñuble",
        "commune_expected": "Chillán",
        "cv_text": """
        RODRIGO ALBERTO FUENTEALBA SANDOVAL
        Profesor de Educación General Básica con mención en Matemáticas
        rodrigo.fuentealba@educa.cl | +56 9 6543 2109 | Chillán, Región de Ñuble

        PERFIL
        Profesor de Educación Básica con 7 años de experiencia de aula en segundo ciclo básico (5° a 8° básico). Especialista en didáctica de la matemática, diseño de instrumentos de evaluación formativa y sumativa, y metodologías de aprendizaje basado en proyectos (ABP).

        EXPERIENCIA
        Colegio Bicentenario de Chillán | Docente de Matemáticas
        Marzo 2018 – Presente | Chillán, Ñuble
        - Docencia directa a 4 cursos (140 estudiantes) con incremento del 18% en resultados SIMCE de matemáticas.
        - Planificación curricular alineada con las Bases Curriculares del MINEDUC.

        EDUCACIÓN
        Universidad del Bío-Bío | Pedagogía en Educación General Básica (2013 - 2017)
        Postítulo en Didáctica de la Matemática Escolar (2020)
        """
    },
    {
        "role_expected": "Desarrollador Full Stack",
        "category": "Tecnología e Informática",
        "region_expected": "Región del Biobío",
        "commune_expected": "Talcahuano",
        "cv_text": """
        RODRIGO ALEJANDRO VERA CASTILLO
        Full Stack Developer | Python, React & Cloud
        rodrigo.vera@techsur.cl | +56 9 4321 0987 | Talcahuano, Región del Biobío

        RESUMEN
        Ingeniero Civil en Informática con 4 años de experiencia en desarrollo backend con FastAPI y frontend moderno en React.

        EXPERIENCIA
        Fintech Sur | Software Engineer
        Febrero 2021 – Presente | Talcahuano / Remoto, Biobío
        - Desarrollo de microservicios de pago de alto rendimiento procesando 1M transacciones/mes.
        - Implementación de pipelines de CI/CD con GitHub Actions y Kubernetes.

        EDUCACIÓN
        Universidad de Concepción | Ingeniería Civil Informática (2014 - 2020)
        AWS Certified Solutions Architect Associate (2022)
        """
    }
]

@pytest.mark.parametrize("profile_data", ACCEPTANCE_PROFILES, ids=[p["role_expected"] for p in ACCEPTANCE_PROFILES])
def test_acceptance_profiles_deterministic_parsing(profile_data):
    """
    Validates deterministic CV parsing across non-tech and tech professions in Chile.
    Asserts detection of name, headline, skills, category, and geographical origin.
    """
    profile = deterministic_cv_parser(profile_data["cv_text"])
    
    assert profile.name, "Debe extraer un nombre válido"
    assert profile.headline, "Debe extraer titular profesional"
    assert profile.primary_profession, f"Error: primary_profession vacío para {profile_data['role_expected']}"
    assert len(profile.equivalent_roles) > 0, f"Error: equivalent_roles vacío para {profile_data['role_expected']}"

    reg, com, _ = detect_region_and_commune(profile_data["cv_text"])
    assert reg == profile_data["region_expected"], f"Región esperada {profile_data['region_expected']}, detectada {reg}"
    assert com == profile_data["commune_expected"], f"Comuna esperada {profile_data['commune_expected']}, detectada {com}"

    if profile_data["category"] != "Tecnología e Informática":
        assert "Software Engineer" not in profile.equivalent_roles, "Error: Software Engineer filtrado en perfil no-TI"
        assert profile.primary_profession != "Software Engineer", "Error: Fallback erróneo a Software Engineer"


def test_geographic_radar_prioritization():
    """
    Validates geographic priority calculation and ranking rule:
    - User in Biobío (Concepción / Talcahuano)
    - Local compatible job (Biobío, fit 92) beats National compatible job (RM, fit 92)
    - National compatible job (RM, fit 92) beats Incompatible local job (Biobío, fit 40)
    """
    user_region = "Región del Biobío"
    user_communes = ["Concepción", "Talcahuano"]

    job_local_perfect = JobPosting(
        title="TENS Urgencia - Hospital Regional",
        company="Servicio de Salud Concepción",
        location="Concepción, Región del Biobío",
        description="Atención clínica directa en servicio de urgencias.",
        fit_score=92.0
    )

    job_national_perfect = JobPosting(
        title="TENS Pabellón Quirúrgico",
        company="Hospital Salvador",
        location="Santiago, Región Metropolitana",
        description="Asistencia en pabellón quirúrgico central.",
        fit_score=92.0
    )

    job_local_low_fit = JobPosting(
        title="Auxiliar de Bodega Hospitalaria",
        company="Clínica Biobío",
        location="Talcahuano, Región del Biobío",
        description="Carga y descarga de insumos en bodega.",
        fit_score=40.0
    )

    _, boost1, _, _ = calculate_geographic_priority(job_local_perfect.location, user_region, user_communes)
    _, boost2, _, _ = calculate_geographic_priority(job_national_perfect.location, user_region, user_communes)
    _, boost3, _, _ = calculate_geographic_priority(job_local_low_fit.location, user_region, user_communes)

    score1 = (job_local_perfect.fit_score or 0) + boost1
    score2 = (job_national_perfect.fit_score or 0) + boost2
    score3 = (job_local_low_fit.fit_score or 0) + boost3

    assert score1 > score2, "El empleo local compatible debe superar al nacional de igual fit"
    assert score2 > score3, "El empleo nacional compatible debe superar al empleo local incompatible"


def test_universal_job_matching_non_tech():
    """
    Validates that a non-tech profile (e.g. TENS) gets accurate
    deterministic match score with relevant job postings via equivalent roles and title keywords.
    """
    tens_cv = ACCEPTANCE_PROFILES[0]["cv_text"]
    profile = deterministic_cv_parser(tens_cv)

    tens_job = JobPosting(
        title="TENS Urgencia - Hospital Clínico",
        company="Red de Salud Regional",
        location="Concepción, Biobío",
        description="Buscamos Técnico en Enfermería de Nivel Superior para servicio de urgencia. Fármacos, curaciones y signos vitales.",
        category="Salud"
    )

    dev_job = JobPosting(
        title="Senior Python Backend Developer",
        company="Fintech SpA",
        location="Santiago, Chile",
        description="Desarrollo de microservicios con FastAPI, PostgreSQL y AWS.",
        category="Tecnología"
    )

    # Match by equivalent roles or primary profession in job title / description
    role_terms = [r.lower() for r in profile.equivalent_roles] + [profile.primary_profession.lower()]
    tens_matches = [t for t in role_terms if t in tens_job.title.lower() or t in tens_job.description.lower()]
    assert len(tens_matches) > 0, "Debe haber coincidencia de roles equivalentes de enfermería para el cargo TENS"

    # Dev job should have zero overlap with TENS equivalent roles
    dev_matches = [t for t in role_terms if t in dev_job.title.lower() or t in dev_job.description.lower()]
    assert len(dev_matches) == 0, "No debe haber coincidencia espuria entre roles TENS y vacante de desarrollo"
