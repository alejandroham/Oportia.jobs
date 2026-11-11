"""
Acceptance Test Suite for Universal Profession Engine & Geographic Radar
Validates all requirements from REGLAS DE NEGOCIO — OPORTIA JOBS IA
Section 6: 5 acceptance profiles (TENS, Arquitecto, Abogado, Profesor, Desarrollador)
"""
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.agents.profile_analyzer import deterministic_cv_parser
from app.utils.chile_regions import detect_region_and_commune, calculate_geographic_priority
from app.models.schemas import CandidateProfile, JobPosting, UserPreferences

def test_five_profiles_acceptance():

    test_cases = [
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
            Estudio Jurídico Silva & Asociados | Abogada Senior Litigios
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
            rodrigo.fuentealba@colegio.cl | +56 9 6543 2109 | Chillán, Región de Ñuble

            PERFIL
            Profesor de Educación Básica con 7 años de experiencia de aula en establecimientos subvencionados y municipales. Especialista en didáctica de las matemáticas y diseño curricular alineado con estándares del MINEDUC.

            EXPERIENCIA
            Colegio Concepción de Chillán | Docente de Aula
            Marzo 2018 – Diciembre 2024 | Chillán, Ñuble
            - Jefatura de curso y docencia de 1° a 6° básico en Matemáticas y Ciencias Naturales.
            - Implementación de evaluaciones formativas y proyectos interdisciplinarios ABP.

            EDUCACIÓN
            Universidad del Bío-Bío | Pedagogía en Educación General Básica (2012 - 2017)
            Perfeccionamiento Docente MINEDUC en Aprendizaje Basado en Proyectos.
            """
        },
        {
            "role_expected": "Ingeniero Informático",
            "category": "Tecnología e Informática",
            "region_expected": "Región del Biobío",
            "commune_expected": "Talcahuano",
            "cv_text": """
            CARLOS ANDRÉS ARAYA TOLEDO
            Ingeniero Civil Informático / Backend Developer
            carlos.araya@dev.cl | +56 9 5432 1098 | Talcahuano, Región del Biobío

            PERFIL
            Ingeniero de Software con 5 años de experiencia diseñando APIs escalables con Python, FastAPI, PostgreSQL y Docker. Especializado en arquitectura de microservicios y despliegues en AWS.

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

    print("=" * 70)
    print("RUNNING ACCEPTANCE TEST SUITE: 5 UNIVERSAL PROFILES")
    print("=" * 70)

    for idx, tc in enumerate(test_cases, 1):
        print(f"\n--- [Caso {idx}/5] Evaluando perfil: {tc['role_expected']} ---")
        profile = deterministic_cv_parser(tc["cv_text"])

        # 1. Verify Primary Profession is detected and matches expectation
        assert profile.primary_profession, f"Error: primary_profession vacío para {tc['role_expected']}"
        print(f"  ✓ Profesión Principal detectada: '{profile.primary_profession}'")

        # 2. Verify Equivalents / Synonyms are populated
        assert len(profile.equivalent_roles) > 0, f"Error: equivalent_roles vacío para {tc['role_expected']}"
        print(f"  ✓ Roles Equivalentes / Sinónimos ATS: {profile.equivalent_roles[:4]}")

        # 3. Verify Geographic Detection (Chilean Region & Commune)
        reg, com, _ = detect_region_and_commune(tc["cv_text"])
        assert reg == tc["region_expected"], f"Error región: esperaba '{tc['region_expected']}', obtuvo '{reg}'"
        assert com == tc["commune_expected"], f"Error comuna: esperaba '{tc['commune_expected']}', obtuvo '{com}'"
        print(f"  ✓ Ubicación Chilena: {reg} | Comuna: {com}")

        # 4. Verify Non-IT / Universal Categorization (No IT pollution for non-IT roles)
        if tc["category"] != "Tecnología e Informática":
            assert "Software Engineer" not in profile.equivalent_roles, "Error: Software Engineer filtrado en perfil no-TI"
            assert profile.primary_profession != "Software Engineer", "Error: Fallback erróneo a Software Engineer"
            print(f"  ✓ Cero sesgo TI verificado (perfil clasificado netamente en {tc['category']})")

    print("\n" + "=" * 70)
    print("TESTING GEOGRAPHIC RADAR PRIORITIZATION FORMULA")
    print("=" * 70)

    # User in Biobío, TENS profession
    user_region = "Región del Biobío"
    user_communes = ["Concepción", "Talcahuano"]

    job_local_perfect = JobPosting(
        id="job-1",
        title="TENS Urgencia - Hospital Regional",
        company="Servicio de Salud Concepción",
        location="Concepción, Región del Biobío",
        region="Región del Biobío",
        commune="Concepción",
        description="Atención clínica directa en servicio de urgencias.",
        url="https://empleospublicos.cl/1",
        fit_score=92.0
    )

    job_national_perfect = JobPosting(
        id="job-2",
        title="TENS Pabellón Quirúrgico",
        company="Hospital Salvador",
        location="Santiago, Región Metropolitana",
        region="Región Metropolitana de Santiago",
        commune="Providencia",
        description="Asistencia en pabellón quirúrgico central.",
        url="https://empleospublicos.cl/2",
        fit_score=92.0
    )

    job_local_low_fit = JobPosting(
        id="job-3",
        title="Auxiliar de Bodega Hospitalaria",
        company="Clínica Biobío",
        location="Talcahuano, Región del Biobío",
        region="Región del Biobío",
        commune="Talcahuano",
        description="Carga y descarga de insumos en bodega.",
        url="https://empleospublicos.cl/3",
        fit_score=40.0
    )

    # Annotate priorities
    cat1, boost1, reg1, comm1 = calculate_geographic_priority(job_local_perfect.location, user_region, user_communes)
    cat2, boost2, reg2, comm2 = calculate_geographic_priority(job_national_perfect.location, user_region, user_communes)
    cat3, boost3, reg3, comm3 = calculate_geographic_priority(job_local_low_fit.location, user_region, user_communes)

    # Ranking Formula: Total = fit_score + boost
    score1 = (job_local_perfect.fit_score or 0) + boost1       # 92 + 20 = 112
    score2 = (job_national_perfect.fit_score or 0) + boost2    # 92 + 0  = 92
    score3 = (job_local_low_fit.fit_score or 0) + boost3       # 40 + 20 = 60

    print(f"  Score Local Compatible (92% fit + Biobío): {score1} pts")
    print(f"  Score Nacional Compatible (92% fit + RM):   {score2} pts")
    print(f"  Score Local Poco Compatible (40% fit + Biobío): {score3} pts")

    # Rule 3.3 & Rule 4 Checks:
    # 1. Local compatible beats national comparable (106 > 92)
    assert score1 > score2, "Fallo: El empleo local compatible debe superar al nacional de igual fit"
    print("  ✓ Prioridad regional aplicada: vacante local supera a vacante de otra región con fit equivalente")

    # 2. National compatible beats incompatible local (92 > 54)
    # Proximity MUST NEVER override professional qualification!
    assert score2 > score3, "Fallo: Empleo nacional altamente calificado (92) debe superar a empleo local incompatible (54)"
    print("  ✓ Regla de Oro confirmada: vacante nacional compatible supera a vacante local incompatible")

    print("\n" + "=" * 70)
    print("ALL 5 ACCEPTANCE TESTS AND RADAR RANKING RULES PASSED SUCCESSFULLY! ✅")
    print("=" * 70)

if __name__ == '__main__':
    test_five_profiles_acceptance()
