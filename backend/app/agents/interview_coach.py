from typing import Dict, Any, List
from app.models.schemas import CandidateProfile, JobPosting
from app.agents.llm_provider import llm, LLMProviderError
import json

class InterviewCoach:
    def generate_prep_kit(self, job: JobPosting, profile: CandidateProfile) -> Dict[str, Any]:
        system_instruction = (
            "Eres un Coach de Entrevistas Técnicas para empresas tecnológicas líderes. "
            "Preparas al candidato con preguntas altamente probables para la vacante específica, "
            "emparejando las preguntas con ejemplos reales del perfil usando el método STAR (Situación, Tarea, Acción, Resultado)."
        )

        prompt = f"""
PUESTO: {job.title} en {job.company}
DESCRIPCIÓN DE LA OFERTA:
{job.description[:3500]}

PERFIL DEL CANDIDATO:
{json.dumps(profile.model_dump(), ensure_ascii=False, indent=2)}

Genera un kit de preparación para la entrevista con:
1. Resumen de lo que la empresa valora más para este puesto.
2. 3 preguntas técnicas clave con qué responder.
3. 3 preguntas conductuales (STAR) mapeadas a experiencias reales del candidato.
4. 2 preguntas inteligentes que el candidato debe hacerle al entrevistador al final.

RESPONDE EN JSON:
{{
  "company_focus": "En qué centrará la atención el equipo de contratación",
  "technical_questions": [
    {{"question": "¿...?", "key_concepts": "Conceptos clave a mencionar", "tip": "Consejo"}}
  ],
  "behavioral_questions": [
    {{"question": "Cuéntame de una ocasión en que...", "suggested_star_story": "Historia recomendada del CV", "focus": "Punto a resaltar"}}
  ],
  "questions_to_ask_interviewer": [
    "Pregunta estratégica 1 para el reclutador o líder técnico",
    "Pregunta estratégica 2"
  ]
}}
"""
        res = llm.generate_json(prompt, system_instruction=system_instruction)
        if not res or not res.get("technical_questions"):
            raise LLMProviderError(
                code="generation_failed",
                message="No se pudo generar el kit de preparación para entrevistas con IA."
            )
        return res

    def evaluate_mock_answer(self, question: str, candidate_answer: str) -> Dict[str, Any]:
        prompt = f"""
Pregunta de entrevista: {question}
Respuesta dada por el candidato: {candidate_answer}

Evalúa la respuesta con retroalimentación constructiva, señalando puntos fuertes y sugerencias para fortalecer el impacto (usando método STAR si aplica).

RESPONDE EN JSON:
{{
  "score": 85,
  "strengths": ["Punto fuerte"],
  "improvements": ["Área a mejorar"],
  "improved_version_sample": "Ejemplo de cómo formularla con mayor impacto"
}}
"""
        res = llm.generate_json(prompt)
        if not res or "score" not in res:
            raise LLMProviderError(
                code="evaluation_failed",
                message="No se pudo evaluar la respuesta con IA."
            )
        return res

interview_coach = InterviewCoach()
