import json
import logging
from typing import Dict, Any, List, Optional
from app.models.schemas import (
    CandidateProfile, UserPreferences, JobPosting, FitEvaluation,
    CompetencyDiagnosticItem, LearningCourseResource, LearningPath,
    LearningPathMilestone, TutorPracticeChallenge, TutorEvaluationResult
)
from app.agents.llm_provider import llm
from app.storage.db import db
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

# Catálogo Verificado de Recursos de Aprendizaje Oficiales
# Cumple la regla estricta: No inventar cursos, proveedores, enlaces ni costos.
VERIFIED_COURSE_CATALOG: List[Dict[str, Any]] = [
    # Microsoft Learn (Oficial, Gratuito)
    {
        "title": "Microsoft Entra ID: Implementación de identidades y accesos",
        "platform": "Microsoft Learn",
        "url": "https://learn.microsoft.com/es-es/training/modules/implement-manage-identities/",
        "competency": "Microsoft Entra ID",
        "level": "Intermedio",
        "duration": "3 a 4 horas",
        "language": "Español",
        "cost": "Gratuito",
        "has_certificate": True,
        "description": "Aprende a administrar usuarios, grupos, licencias y directivas de acceso condicional y autenticación multifactor (MFA)."
    },
    {
        "title": "Administración y Seguridad en Microsoft 365 (MS-102)",
        "platform": "Microsoft Learn",
        "url": "https://learn.microsoft.com/es-es/training/paths/m365-administrator-prerequisites/",
        "competency": "Microsoft 365",
        "level": "Avanzado",
        "duration": "8 horas",
        "language": "Español",
        "cost": "Gratuito",
        "has_certificate": True,
        "description": "Ruta oficial de Microsoft para la gestión de infraestructura, servicios en la nube, gobierno TI y cumplimiento."
    },
    {
        "title": "Continuidad Operacional y Recuperación ante Desastres en Azure",
        "platform": "Microsoft Learn",
        "url": "https://learn.microsoft.com/es-es/training/modules/azure-business-continuity-disaster-recovery/",
        "competency": "Continuidad operacional",
        "level": "Intermedio",
        "duration": "2.5 horas",
        "language": "Español",
        "cost": "Gratuito",
        "has_certificate": True,
        "description": "Estrategias de copias de seguridad (Azure Backup), redundancia geográfica y conmutación por error (Site Recovery)."
    },
    {
        "title": "Fundamentos de Seguridad, Cumplimiento e Identidad (SC-900)",
        "platform": "Microsoft Learn",
        "url": "https://learn.microsoft.com/es-es/training/paths/describe-concepts-of-security-compliance-identity/",
        "competency": "Ciberseguridad",
        "level": "Básico",
        "duration": "4 horas",
        "language": "Español",
        "cost": "Gratuito",
        "has_certificate": True,
        "description": "Conceptos de confianza cero (Zero Trust), gestión de amenazas y cumplimiento normativo de seguridad."
    },
    # AWS Skill Builder (Oficial, Gratuito / Certificación)
    {
        "title": "AWS Cloud Practitioner Essentials",
        "platform": "AWS Skill Builder",
        "url": "https://explore.skillbuilder.aws/learn/course/external/view/elearning/10114/aws-cloud-practitioner-essentials-spanish",
        "competency": "Cloud Computing / AWS",
        "level": "Básico",
        "duration": "6 horas",
        "language": "Español",
        "cost": "Gratuito",
        "has_certificate": True,
        "description": "Fundamentos de la nube de AWS, seguridad de datos, conceptos de arquitectura escalable y economía cloud."
    },
    {
        "title": "AWS Well-Architected Framework: Fiabilidad y Seguridad",
        "platform": "AWS Skill Builder",
        "url": "https://aws.amazon.com/es/architecture/well-architected/",
        "competency": "Arquitectura Cloud",
        "level": "Avanzado",
        "duration": "5 horas",
        "language": "Español",
        "cost": "Gratuito",
        "has_certificate": False,
        "description": "Directrices y patrones de diseño para construir cargas de trabajo resilientes, seguras y de alto rendimiento."
    },
    # Cisco Networking Academy (Oficial, Gratuito)
    {
        "title": "Cybersecurity Essentials: Defensa de Redes y Sistemas",
        "platform": "Cisco Networking Academy",
        "url": "https://www.skillsforall.com/course/cybersecurity-essentials?courseLang=es-XL",
        "competency": "Ciberseguridad",
        "level": "Intermedio",
        "duration": "30 horas",
        "language": "Español",
        "cost": "Gratuito",
        "has_certificate": True,
        "description": "Controles de seguridad táctica, detección de vulnerabilidades, integridad de datos, confidencialidad y gobernanza."
    },
    # Google Skillshop / Cloud (Oficial, Gratuito)
    {
        "title": "Google Cloud Computing Foundations",
        "platform": "Google Skillshop",
        "url": "https://www.cloudskillsboost.google/paths/11",
        "competency": "Google Cloud",
        "level": "Intermedio",
        "duration": "12 horas",
        "language": "Español / Inglés",
        "cost": "Gratuito",
        "has_certificate": True,
        "description": "Redes virtuales, infraestructura de cómputo, almacenamiento y seguridad de servicios cloud en GCP."
    },
    # Kubernetes & Docker (Documentación Oficial y Laboratorios Abiertos)
    {
        "title": "Kubernetes: Orquestación de Contenedores y Cargas Distribuidas",
        "platform": "Documentación Oficial",
        "url": "https://kubernetes.io/es/docs/tutorials/kubernetes-basics/",
        "competency": "Kubernetes",
        "level": "Intermedio",
        "duration": "10 horas",
        "language": "Español",
        "cost": "Gratuito",
        "has_certificate": False,
        "description": "Laboratorios interactivos de despliegues, pods, servicios, escalado automático y alta disponibilidad."
    },
    {
        "title": "Docker: Arquitectura de Contenedores y Buenas Prácticas",
        "platform": "Documentación Oficial",
        "url": "https://docs.docker.com/get-started/",
        "competency": "Docker",
        "level": "Básico",
        "duration": "5 horas",
        "language": "Español / Inglés",
        "cost": "Gratuito",
        "has_certificate": False,
        "description": "Creación de imágenes optimizadas, multi-stage builds, redes de contenedores y orquestación con Docker Compose."
    },
    # SENCE / Talento Digital Chile (Público, Gratuito para Chile)
    {
        "title": "Cursos en Línea SENCE: Ciberseguridad y Gestión de TI",
        "platform": "SENCE",
        "url": "https://sence.gob.cl/personas/cursos-en-linea",
        "competency": "Gobierno TI",
        "level": "Intermedio",
        "duration": "20 a 40 horas",
        "language": "Español",
        "cost": "Gratuito",
        "has_certificate": True,
        "description": "Capacitación oficial del Estado de Chile en alianza con Coursera y Fundación Telefónica con certificación formal."
    },
    # Coursera / edX
    {
        "title": "Google Project Management Professional Certificate",
        "platform": "Coursera",
        "url": "https://www.coursera.org/professional-certificates/google-project-management",
        "competency": "Liderazgo y Gestión de Proyectos",
        "level": "Intermedio",
        "duration": "6 meses (a tu ritmo)",
        "language": "Español",
        "cost": "Suscripción / Ayuda Económica",
        "has_certificate": True,
        "description": "Metodologías ágiles (Scrum), gestión de presupuestos, mitigación de riesgos de proyectos y comunicación ejecutiva."
    }
]

class CareerCoach:
    """
    Opi Coach de Oportia Jobs IA: Asistente Integral de Desarrollo Profesional.
    Implementa las 6 capacidades funcionales especificadas:
    A. Diagnóstico de competencias y brechas.
    B. Buscador inteligente de cursos y capacitaciones verificadas.
    C. Generador de rutas de aprendizaje.
    D. Tutor personal y preparación técnica.
    E. Preparación para entrevistas laborales según rol del entrevistador.
    F. Seguimiento del progreso profesional y acreditación de evidencias.
    """

    # --- CAPACIDAD A: DIAGNÓSTICO DE COMPETENCIAS ---
    def generate_or_get_diagnostic(self, profile: CandidateProfile, target_role: Optional[str] = None) -> List[CompetencyDiagnosticItem]:
        existing = db.get_competencies()
        if existing:
            return existing

        # Build initial diagnostic from CandidateProfile and experiences
        items: List[CompetencyDiagnosticItem] = []
        for skill in profile.technical_skills[:12]:
            # Detect evidence from experiences
            evidences = []
            for exp in profile.experiences:
                if any(skill.lower() in t.lower() for t in exp.technologies) or skill.lower() in exp.description.lower():
                    evidences.append(f"{exp.role} en {exp.company}")

            level = "Avanzado" if len(evidences) >= 2 else "Intermedio" if evidences else "Básico"
            items.append(
                CompetencyDiagnosticItem(
                    name=skill,
                    category="Técnica",
                    declared_level=level,
                    estimated_level=level,
                    validation_status="validada" if len(evidences) >= 2 else "completado" if evidences else "en_aprendizaje",
                    evidences=evidences[:3]
                )
            )

        for soft in profile.soft_skills[:6]:
            items.append(
                CompetencyDiagnosticItem(
                    name=soft,
                    category="Transversal",
                    declared_level="Avanzado",
                    estimated_level="Intermedio",
                    validation_status="en_aprendizaje",
                    evidences=["Competencia transversal declarada en CV"]
                )
            )

        db.save_competencies(items)
        return items

    def sync_gaps_from_evaluation(self, evaluation: FitEvaluation, job_title: str) -> List[CompetencyDiagnosticItem]:
        """Incorporates gaps detected by the Comité into the Competency Matrix."""
        current_comps = {c.name.lower(): c for c in db.get_competencies()}
        new_items: List[CompetencyDiagnosticItem] = []

        for gap in evaluation.missing_skills:
            clean_gap = gap.strip()
            if not clean_gap:
                continue
            key = clean_gap.lower()
            if key in current_comps:
                comp = current_comps[key]
                if job_title not in comp.source_job_gaps:
                    comp.source_job_gaps.append(job_title)
                comp.updated_at = datetime.utcnow().isoformat()
            else:
                new_item = CompetencyDiagnosticItem(
                    name=clean_gap,
                    category="Técnica",
                    declared_level="Básico",
                    estimated_level="Básico",
                    validation_status="en_aprendizaje",
                    evidences=[],
                    source_job_gaps=[job_title]
                )
                current_comps[key] = new_item
                new_items.append(new_item)

        all_updated = list(current_comps.values())
        db.save_competencies(all_updated)
        return all_updated

    # --- CAPACIDAD B: BUSCADOR INTELIGENTE DE CURSOS Y CAPACITACIONES ---
    def search_verified_courses(self, query: str = "", competency: str = "", cost_filter: Optional[str] = None) -> List[LearningCourseResource]:
        """Search in the verified official course directory without hallucinating URLs or prices."""
        results: List[LearningCourseResource] = []
        q_lower = query.lower() if query else ""
        comp_lower = competency.lower() if competency else ""

        for item in VERIFIED_COURSE_CATALOG:
            item_comp = item["competency"].lower()
            item_title = item["title"].lower()
            item_desc = item["description"].lower()

            matches_query = not q_lower or (q_lower in item_comp or q_lower in item_title or q_lower in item_desc)
            matches_comp = not comp_lower or (comp_lower in item_comp or comp_lower in item_title)
            matches_cost = not cost_filter or (cost_filter.lower() in item["cost"].lower())

            if matches_query and matches_comp and matches_cost:
                results.append(LearningCourseResource(**item))

        # If specific competency query had no direct match, return most relevant foundational resources
        if not results and (query or competency):
            for item in VERIFIED_COURSE_CATALOG[:4]:
                results.append(LearningCourseResource(**item))

        return results

    # --- CAPACIDAD C: GENERADOR DE RUTAS DE APRENDIZAJE ---
    def generate_learning_path(self, target_role: str, gaps: List[str], profile: CandidateProfile) -> LearningPath:
        """Generates an organized, progressive learning path structured in logical milestones."""
        matched_resources = []
        for gap in gaps[:4]:
            found = self.search_verified_courses(competency=gap)
            if found:
                matched_resources.extend(found[:2])

        if not matched_resources:
            matched_resources = [LearningCourseResource(**c) for c in VERIFIED_COURSE_CATALOG[:3]]

        system_instruction = (
            "Eres un Diseñador Curricular Senior y Coach de Aprendizaje Técnico para Oportia Jobs IA. "
            "Tu misión es estructurar una ruta de aprendizaje de 3 a 4 hitos secuenciales y lógicos "
            "para cerrar las brechas detectadas hacia el cargo objetivo. "
            "Cada hito debe incluir un objetivo claro, una actividad práctica de aplicación real y un desafío evaluable."
        )

        prompt = f"""
ROL OBJETIVO: {target_role}
BRECHAS DETECTADAS POR EL COMITÉ:
{json.dumps(gaps, ensure_ascii=False)}

PERFIL ACTUAL:
{profile.name} - {profile.headline} ({profile.years_of_experience} años de experiencia)

RECURSOS OFICIALES DISPONIBLES:
{json.dumps([{"title": r.title, "platform": r.platform, "url": r.url, "competency": r.competency} for r in matched_resources], ensure_ascii=False)}

GENERA UNA RUTA EN FORMATO JSON CON ESTA ESTRUCTURA:
{{
  "title": "Ruta de Nivelación y Crecimiento: {target_role}",
  "overview": "Párrafo breve explicando la progresión del aprendizaje...",
  "estimated_weeks": 3,
  "milestones": [
    {{
      "step_number": 1,
      "title": "Fundamentos y Configuración Base",
      "objective": "Objetivo de aprendizaje del hito 1",
      "competencies_targeted": ["Competencia 1"],
      "practical_activity": "Actividad práctica real (ej. desplegar laboratorio o configurar directivas)",
      "evaluation_challenge": "Desafío concreto para demostrar dominio"
    }},
    {{
      "step_number": 2,
      "title": "Implementación Práctica y Buenas Prácticas",
      "objective": "Objetivo de aprendizaje del hito 2",
      "competencies_targeted": ["Competencia 2"],
      "practical_activity": "Actividad aplicada",
      "evaluation_challenge": "Desafío práctico"
    }},
    {{
      "step_number": 3,
      "title": "Consolidación y Proyecto Demostrable",
      "objective": "Integración completa con métricas de valor",
      "competencies_targeted": ["Competencia 1", "Competencia 2"],
      "practical_activity": "Diseñar propuesta o arquitectura para una organización",
      "evaluation_challenge": "Evaluación final de proyecto"
    }}
  ]
}}
"""

        res = llm.generate_json(prompt, system_instruction=system_instruction)
        milestones_raw = res.get("milestones", [])

        if not milestones_raw:
            milestones_raw = [
                {
                    "step_number": 1,
                    "title": "Fundamentos y Conceptos Clave",
                    "objective": f"Dominar los conceptos base y terminología de {', '.join(gaps[:2]) if gaps else target_role}.",
                    "competencies_targeted": gaps[:2] if gaps else [target_role],
                    "practical_activity": "Completar módulos oficiales y laboratorios iniciales guiados.",
                    "evaluation_challenge": "Test conceptual y configuración de entorno base."
                },
                {
                    "step_number": 2,
                    "title": "Implementación Práctica y Arquitectura",
                    "objective": "Desarrollar capacidades de resolución de problemas en escenarios reales.",
                    "competencies_targeted": gaps[1:3] if len(gaps) > 1 else gaps[:1],
                    "practical_activity": "Desarrollar un caso de uso práctico simulando requerimientos empresariales.",
                    "evaluation_challenge": "Resolver caso de aplicación técnica ante el Tutor IA."
                },
                {
                    "step_number": 3,
                    "title": "Integración y Proyecto de Impacto",
                    "objective": "Acreditar dominio integral con métricas cuantificables para el CV.",
                    "competencies_targeted": gaps[:3],
                    "practical_activity": "Elaborar propuesta técnica integral con consideraciones de seguridad y costos.",
                    "evaluation_challenge": "Defensa de proyecto y registro de evidencia en el perfil."
                }
            ]

        milestones: List[LearningPathMilestone] = []

        for idx, m in enumerate(milestones_raw, 1):
            # Attach matched resources to relevant milestone
            m_resources = matched_resources[idx-1:idx] if idx <= len(matched_resources) else matched_resources[:1]
            milestones.append(
                LearningPathMilestone(
                    step_number=m.get("step_number", idx),
                    title=m.get("title", f"Hito {idx}"),
                    objective=m.get("objective", "Desarrollo de competencias clave"),
                    competencies_targeted=m.get("competencies_targeted", gaps[:2]),
                    resources=m_resources,
                    practical_activity=m.get("practical_activity", "Desarrollar ejercicio práctico"),
                    evaluation_challenge=m.get("evaluation_challenge", "Resolver caso laboral con el Tutor"),
                    status="in_progress" if idx == 1 else "pending"
                )
            )

        learning_path = LearningPath(
            title=res.get("title", f"Ruta de Especialización hacia {target_role}"),
            target_role=target_role,
            overview=res.get("overview", f"Ruta diseñada para cerrar brechas clave hacia {target_role}."),
            estimated_weeks=res.get("estimated_weeks", 3),
            milestones=milestones,
            progress_percentage=0
        )

        db.save_learning_path(learning_path)
        return learning_path

    # --- CAPACIDAD D: TUTOR PERSONAL Y PREPARACIÓN TÉCNICA ---
    def generate_practice_challenge(self, competency: str, seniority: str = "Intermedio") -> TutorPracticeChallenge:
        """Creates an applied workplace scenario/challenge for hands-on problem solving."""
        system_instruction = (
            "Eres un Tutor Senior de Ingeniería y Gestión. Diseñas desafíos prácticos basados en escenarios "
            "laborales reales para evaluar el pensamiento crítico y la fundamentación técnica de un candidato."
        )

        prompt = f"""
COMPETENCIA A EVALUAR: {competency}
NIVEL DE SENIORITY: {seniority}

Genera un caso práctico laboral desafiante con esta estructura JSON:
{{
  "scenario_title": "Título del escenario laboral (ej. Contingencia de Continuidad Operacional en Red Distribuida)",
  "scenario_context": "Descripción realista de una empresa con un problema urgente o desafío técnico",
  "problem_statement": "¿Qué estrategia, arquitectura o plan implementarías para resolver esta situación y mitigar riesgos?",
  "evaluation_rubric": [
    "Criterio 1: Corrección técnica y fundamentación",
    "Criterio 2: Viabilidad operativa y costos",
    "Criterio 3: Seguridad y gestión de riesgos"
  ],
  "difficulty": "{seniority}"
}}
"""
        res = llm.generate_json(prompt, system_instruction=system_instruction)
        return TutorPracticeChallenge(
            competency=competency,
            scenario_title=res.get("scenario_title", f"Caso de Aplicación Práctica: {competency}"),
            scenario_context=res.get("scenario_context", f"Una organización enfrenta requerimientos críticos en {competency}."),
            problem_statement=res.get("problem_statement", f"Propón una solución estructurada para implementar {competency} con altos estándares de calidad."),
            evaluation_rubric=res.get("evaluation_rubric", ["Corrección técnica", "Viabilidad", "Gestión de riesgos"]),
            difficulty=seniority
        )

    def evaluate_tutor_response(self, challenge: TutorPracticeChallenge, candidate_solution: str) -> TutorEvaluationResult:
        """Evaluates the candidate's proposed solution against the challenge rubric."""
        system_instruction = (
            "Eres un Evaluador Técnico de Élite. Evalúas la propuesta del candidato con rigor, "
            "señalando puntos fuertes, omisiones y si la respuesta acredita competencia demostrable."
        )

        prompt = f"""
DESAFÍO PLANTEADO:
- Escenario: {challenge.scenario_title}
- Contexto: {challenge.scenario_context}
- Pregunta: {challenge.problem_statement}
- Rúbrica: {', '.join(challenge.evaluation_rubric)}

SOLUCIÓN PROPUESTA POR EL CANDIDATO:
{candidate_solution}

EVALÚA EN FORMATO JSON:
{{
  "score": 85,
  "technical_correctness": "Explicación de la solidez técnica de la propuesta...",
  "feedback": "Retroalimentación constructiva para elevar el impacto...",
  "strengths": ["Punto fuerte 1", "Punto fuerte 2"],
  "areas_for_improvement": ["Área a mejorar o detalle omitido"],
  "competency_validated": true
}}
"""
        res = llm.generate_json(prompt, system_instruction=system_instruction)
        score = res.get("score", 75)
        is_validated = score >= 80

        evidence_text = f"Resolución exitosa de caso de aplicación en {challenge.competency} con puntuación {score}/100 ante el Tutor IA ({datetime.utcnow().strftime('%d/%m/%Y')})." if is_validated else None

        # If validated, update competency matrix
        if is_validated:
            comps = db.get_competencies()
            for c in comps:
                if c.name.lower() == challenge.competency.lower():
                    c.validation_status = "validada"
                    if evidence_text and evidence_text not in c.evidences:
                        c.evidences.append(evidence_text)
                    db.save_competency(c)
                    break

        return TutorEvaluationResult(
            challenge_id=challenge.id,
            score=score,
            technical_correctness=res.get("technical_correctness", "Solución razonada y aplicable."),
            feedback=res.get("feedback", "Buen enfoque global."),
            strengths=res.get("strengths", ["Enfoque estructurado"]),
            areas_for_improvement=res.get("areas_for_improvement", []),
            competency_validated=is_validated,
            evidence_generated=evidence_text
        )

    # --- CAPACIDAD E: PREPARACIÓN PARA ENTREVISTAS POR ROL ---
    def generate_targeted_interview_prep(self, job: JobPosting, profile: CandidateProfile, interviewer_role: str = "all") -> Dict[str, Any]:
        """
        Prepares interview simulation tailored to the specific interviewer perspective:
        - 'rrhh': Recursos Humanos (ajuste cultural, motivación, trayectoria, pretensión).
        - 'hiring_manager': Jefe de Área (autonomía, liderazgo, resolución de problemas, impacto).
        - 'technical': Líder Técnico (arquitectura, depuración, trade-offs, seguridad).
        Anticipates hard questions based on gaps identified in the evaluation.
        """
        stored_eval = db.get_evaluation(job.id)
        gaps_context = ""
        if stored_eval and stored_eval.missing_skills:
            gaps_context = f"\nBRECHAS ESPECÍFICAS DETECTADAS POR EL COMITÉ (Anticipar preguntas difíciles sobre estos temas):\n" + "\n".join([f"- {g}" for g in stored_eval.missing_skills])

        system_instruction = (
            "Eres un Coach de Entrevistas de Selección de Nivel Ejecutivo. "
            f"Preparas al candidato para una entrevista con el rol: {interviewer_role.upper()}. "
            "Utiliza el método STAR (Situación, Tarea, Acción, Resultado) y empareja preguntas difíciles "
            "con los logros reales del currículum del candidato."
        )

        prompt = f"""
PUESTO: {job.title} en {job.company}
ROL DEL ENTREVISTADOR: {interviewer_role} (RR. HH., Jefe Contratante o Líder Técnico)
DESCRIPCIÓN DE LA OFERTA:
{job.description[:3500]}

{gaps_context}

PERFIL DEL CANDIDATO:
- Nombre: {profile.name}
- Experiencias: {[f"{e.role} en {e.company}" for e in profile.experiences[:3]]}
- Habilidades: {', '.join(profile.technical_skills[:8])}

Genera un kit de preparación para la entrevista en JSON:
{{
  "interviewer_perspective": "Qué prioriza evaluar este entrevistador ({interviewer_role})",
  "anticipated_hard_questions": [
    {{
      "question": "¿Cómo responderías a una brecha sobre...?",
      "reason": "Por qué harán esta pregunta difícil según la oferta",
      "suggested_star_approach": "Cómo enfocarla honestamente destacando competencias transferibles",
      "pitfall_to_avoid": "Qué error NO cometer al responder"
    }}
  ],
  "role_specific_questions": [
    {{
      "question": "Pregunta clave 1",
      "focus": "Foco a resaltar",
      "tip": "Consejo táctico"
    }},
    {{
      "question": "Pregunta clave 2",
      "focus": "Foco a resaltar",
      "tip": "Consejo táctico"
    }}
  ],
  "questions_to_ask_interviewer": [
    "Pregunta de alto impacto 1 para hacerle al entrevistador al cierre",
    "Pregunta de alto impacto 2"
  ]
}}
"""
        res = llm.generate_json(prompt, system_instruction=system_instruction)
        return res

career_coach = CareerCoach()