"""
Pytest configuration and shared fixtures for Oportia Jobs IA.
Guarantees 100% offline, isolated test execution with zero external network requests
and zero side-effects on local user data.
"""

import sys
import os
import tempfile
from pathlib import Path
import pytest

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.storage.db import Database, db
from app.agents.llm_provider import llm
from app.models.schemas import CandidateProfile, JobPosting, UserPreferences

@pytest.fixture(autouse=True)
def isolated_db(monkeypatch):
    """
    Directs all file storage to a temporary directory for each test run.
    Ensures zero side-effects on production or local files.
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        monkeypatch.setattr(settings, "DATA_DIR", tmp_path)
        monkeypatch.setattr(settings, "PROFILE_FILE", tmp_path / "profile.json")
        monkeypatch.setattr(settings, "PREFERENCES_FILE", tmp_path / "preferences.json")
        monkeypatch.setattr(settings, "JOBS_FILE", tmp_path / "jobs.json")
        monkeypatch.setattr(settings, "APPLICATIONS_FILE", tmp_path / "applications.json")
        monkeypatch.setattr(settings, "FEEDBACK_FILE", tmp_path / "feedback_events.json")
        monkeypatch.setattr(settings, "LLM_SETTINGS_FILE", tmp_path / "llm_settings.json")
        monkeypatch.setattr(settings, "COMPANIES_FILE", tmp_path / "companies.json")
        monkeypatch.setattr(settings, "ROLE_RECOMMENDATIONS_FILE", tmp_path / "role_recommendations.json")
        monkeypatch.setattr(settings, "EVALUATIONS_FILE", tmp_path / "evaluations.json")
        monkeypatch.setattr(settings, "COACH_DATA_FILE", tmp_path / "coach_data.json")
        monkeypatch.setattr(settings, "UPLOADS_DIR", tmp_path / "uploads")

        # Re-initialize db files in the temp directory
        test_db = Database()
        monkeypatch.setattr("app.storage.db.db", test_db)
        monkeypatch.setattr("app.agents.preference_learner.db", test_db)
        monkeypatch.setattr("app.agents.career_coach.db", test_db)
        monkeypatch.setattr("app.agents.profile_analyzer.db", test_db)
        monkeypatch.setattr("app.agents.drafter_reviewer.db", test_db)
        monkeypatch.setattr("app.agents.fit_evaluator.db", test_db)
        monkeypatch.setattr("app.mcp_server.db", test_db)

        yield test_db

@pytest.fixture
def mock_llm(monkeypatch):
    """
    Mock LLM generator providing deterministic responses for all agent workflows:
    5D Fit Evaluation, Drafter, Reviewer, Interview Coach, Career Coach, and Chat Opi.
    """
    original_generate_json = llm.generate_json
    original_generate_text = llm.generate_text

    def fake_generate_json(prompt: str, system_instruction: str = None):
        p_lower = prompt.lower()
        if "evaluar ajuste" in p_lower or "overall_score" in p_lower or "committee_evaluations" in p_lower:
            return {
                "committee_evaluations": [
                    {"role_id": "rrhh", "role_name": "Reclutador RR. HH.", "score": 88, "weight_percentage": 25, "justification": "Perfil afín", "strengths": ["Experiencia sólida"], "gaps": [], "key_question": "¿Cumple?", "question_verdict": "Cumple ampliamente."},
                    {"role_id": "hiring_manager", "role_name": "Jefe Contratante", "score": 84, "weight_percentage": 25, "justification": "Solvencia técnica", "strengths": ["Proyectos reales"], "gaps": [], "key_question": "¿Contrataría?", "question_verdict": "Sí."},
                    {"role_id": "technical", "role_name": "Evaluador Técnico", "score": 86, "weight_percentage": 25, "justification": "Stack sólido", "strengths": ["Python y FastAPI"], "gaps": [], "key_question": "¿Conocimientos?", "question_verdict": "Sí."},
                    {"role_id": "ats", "role_name": "Especialista ATS", "score": 92, "weight_percentage": 15, "justification": "Alta legibilidad", "strengths": ["Palabras clave"], "gaps": [], "key_question": "¿Legible?", "question_verdict": "Excelente."},
                    {"role_id": "career_consultant", "role_name": "Consultor Estratégico", "score": 88, "weight_percentage": 10, "justification": "Buen avance", "strengths": ["Alineación"], "gaps": [], "key_question": "¿Buen paso?", "question_verdict": "Sí."}
                ],
                "requirements_matrix": [
                    {"requirement": "Python & FastAPI", "cv_evidence": "Listado en habilidades y proyectos", "status": "cumplido", "importance": "excluyente"}
                ],
                "strengths": ["Python y desarrollo backend", "Arquitectura cloud"],
                "missing_skills": ["Certificación específica"],
                "deal_breakers_found": []
            }
        elif "vacante objetivo" in p_lower or "tailored_cv_markdown" in p_lower:
            return {
                "tailored_cv_markdown": "# Perfil Adaptado\n**Ingeniero de Software**\n- Experto en desarrollo ágil",
                "cover_letter": "Estimado equipo de selección,\nPresento mi postulación con entusiasmo para el rol."
            }
        elif "audita esta postulación" in p_lower or "ats_score" in p_lower:
            return {
                "ats_score": 94,
                "ats_feedback": ["Estructura clara", "Palabras clave integradas"],
                "reviewer_critique": "Excelente ajuste documental y alineación ATS."
            }
        elif "kit de preparación" in p_lower or "technical_questions" in p_lower:
            return {
                "company_focus": "Enfoque en arquitectura escalable y resolución de problemas",
                "technical_questions": [{"question": "¿Cómo escalas una API con FastAPI?", "key_concepts": "AsyncIO, workers, pooling", "tip": "Cita métricas reales."}],
                "behavioral_questions": [{"question": "Cuéntame de un desafío técnico complejo", "suggested_star_story": "Migración a microservicios", "focus": "Impacto"}],
                "questions_to_ask_interviewer": ["¿Cuáles son los retos principales de este trimestre?"]
            }
        elif "competencia a evaluar" in p_lower:
            return {
                "scenario_title": "Contingencia de Red y Escalabilidad",
                "scenario_context": "Una organización enfrenta requerimientos críticos de alta disponibilidad.",
                "problem_statement": "Propón una arquitectura resiliente para mitigar fallos.",
                "evaluation_rubric": ["Corrección técnica", "Viabilidad", "Gestión de riesgos"]
            }
        elif "desafío planteado" in p_lower:
            return {
                "score": 90,
                "technical_correctness": "Arquitectura y fundamentación técnica sólida con GitOps y políticas de red.",
                "feedback": "Excelente cobertura de alta disponibilidad y mitigación de riesgos.",
                "strengths": ["Uso adecuado de ArgoCD", "Políticas de red con Calico"],
                "areas_for_improvement": [],
                "competency_validated": True
            }
        elif "ruta diseñada" in p_lower or "learning_path" in p_lower or "ruta de especialización" in p_lower:
            return {
                "title": "Ruta de Especialización hacia Lead Cloud & AI Engineer",
                "overview": "Ruta diseñada para consolidar alta disponibilidad y arquitectura cloud.",
                "estimated_weeks": 4,
                "milestones": [
                    {"step_number": 1, "title": "Fundamentos y Conceptos Clave", "objective": "Dominar conceptos de Kubernetes", "competencies_targeted": ["Kubernetes"], "practical_activity": "Laboratorio guiado", "evaluation_challenge": "Test conceptual"},
                    {"step_number": 2, "title": "Implementación Práctica", "objective": "Desarrollar capacidades operativas", "competencies_targeted": ["Ciberseguridad"], "practical_activity": "Caso práctico", "evaluation_challenge": "Resolver caso"},
                    {"step_number": 3, "title": "Integración y Proyecto", "objective": "Acreditar dominio integral", "competencies_targeted": ["Kubernetes", "Ciberseguridad"], "practical_activity": "Propuesta técnica", "evaluation_challenge": "Defensa"}
                ]
            }
        elif "historial de acciones" in p_lower or "insights" in p_lower:
            return {
                "insights": [
                    "Prioriza posiciones 100% remotas con compensación competitiva",
                    "Preferencia por arquitecturas con Python, FastAPI e Inteligencia Artificial",
                    "Afinidad por empresas con cultura asíncrona y autonomía técnica"
                ]
            }
        return {}

    def fake_generate_text(prompt: str, system_instruction: str = None) -> str:
        return "Respuesta simulada offline para pruebas deterministas."

    monkeypatch.setattr(llm, "generate_json", fake_generate_json)
    monkeypatch.setattr(llm, "generate_text", fake_generate_text)

    yield {
        "generate_json": fake_generate_json,
        "generate_text": fake_generate_text
    }

@pytest.fixture
def sample_developer_cv():
    return """
    Alex Dev
    Senior AI & Full Stack Engineer | Santiago, Chile (Disponible Remoto Global)
    Email: alex.dev@example.com | LinkedIn: linkedin.com/in/alexdev

    Perfil Profesional:
    Ingeniero de Software con más de 7 años de experiencia construyendo arquitecturas distribuidas, 
    agentes de inteligencia artificial y aplicaciones full stack de alto tráfico.

    Habilidades Técnicas:
    Python, FastAPI, TypeScript, React, Docker, Kubernetes, Google Cloud, PostgreSQL, Gemini API, PyTorch.

    Idiomas:
    Español: Nativo
    Inglés: C1 Profesional

    Experiencia Laboral:
    Lead AI Engineer — TechGlobal Inc (2022 - Presente)
    - Diseñó e implementó agentes autónomos para optimización de flujos B2B reduciendo tiempos de procesamiento en 45%.
    - Lideró equipo de 6 ingenieros full stack en entornos 100% remotos y asíncronos.
    - Stack: Python, React, FastAPI, Docker, GCP.

    Senior Software Engineer — CloudSolutions (2019 - 2022)
    - Migró monolito legado a microservicios basados en contenedores, mejorando la disponibilidad a 99.98%.
    - Diseñó APIs RESTful y pipelines CI/CD automatizados.

    Educación:
    Ingeniería en Informática — Universidad (2018)
    """

@pytest.fixture
def sample_target_job():
    return JobPosting(
        title="Senior AI Python Engineer (100% Remote)",
        company="ModernScale AI",
        location="Worldwide Remote",
        is_remote=True,
        salary_range="$85,000 - $110,000 USD",
        description="Buscamos un Senior AI Engineer experto en Python, FastAPI, React y arquitecturas con LLMs para trabajar en equipo distribuido global.",
        source="remote_boards"
    )
