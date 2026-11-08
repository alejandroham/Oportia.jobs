import json
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.models.schemas import (
    FeedbackAction,
    UserPreferences,
    ProfileDNA,
    LearnedStarStory,
    MemoryStats,
    CandidateProfile
)
from app.storage.db import db
from app.agents.llm_provider import llm

logger = logging.getLogger(__name__)

class PreferenceLearner:
    def reset_memory(self) -> UserPreferences:
        """Wipes all learned cognitive memory and feedback history to start completely fresh."""
        prefs = db.get_preferences()
        prefs.auto_learned_insights = []
        prefs.learned_star_stories = []
        prefs.industry_insights = []
        prefs.profile_dna = ProfileDNA(
            summary="Perfil en proceso de calibración inicial.",
            seniority_level="Por calibrar",
            core_strengths=[],
            communication_tone="Por definir"
        )
        prefs.memory_stats = MemoryStats(
            cv_analyzed=False,
            total_applications_learned=0,
            total_star_answers_learned=0,
            maturity_percentage=10,
            last_consolidated_at=None
        )
        prefs.updated_at = datetime.utcnow().isoformat()

        # Reset feedback events history as well so prior likes/dismisses don't repopulate
        try:
            from app.config import settings
            db._write_json(settings.FEEDBACK_FILE, [])
        except Exception as e:
            logger.warning(f"Could not reset feedback file: {e}")

        db.save_preferences(prefs)
        logger.info("Cognitive AI Memory completely reset to clean state.")
        return prefs

    def process_feedback(self, event: FeedbackAction) -> UserPreferences:
        """Records feedback and incrementally learns radar preferences."""
        db.record_feedback(event)
        history = db.get_feedback_history()
        prefs = db.get_preferences()

        if len(history) >= 2:
            try:
                new_insights = self._extract_insights(history, prefs)
                if new_insights:
                    prefs.auto_learned_insights = new_insights
                    self._update_maturity(prefs)
                    db.save_preferences(prefs)
            except Exception as e:
                logger.error(f"Error extracting learned insights: {e}")

        return prefs

    def learn_from_star_answer(
        self,
        question: str,
        candidate_answer: str,
        evaluation: Dict[str, Any],
        company: Optional[str] = None
    ) -> Optional[LearnedStarStory]:
        """
        Learns an achievement story from the candidate's answer in the STAR simulator.
        Stores it as a reusable STAR Story in the AI Memory.
        """
        score = evaluation.get("score", 75)
        # We learn especially from answers with acceptable or good substance
        if len(candidate_answer.strip()) < 30:
            return None

        prefs = db.get_preferences()
        system_instruction = (
            "Eres un extractor de logros profesionales con metodología STAR (Situación, Tarea, Acción, Resultado). "
            "A partir de la pregunta y la respuesta del candidato en una entrevista simulada, extrae un caso de éxito "
            "conciso, concreto y verificado para su memoria profesional."
        )

        prompt = f"""
PREGUNTA DE ENTREVISTA:
{question}

RESPUESTA DEL CANDIDATO:
{candidate_answer}

DIAGNÓSTICO DEL EVALUADOR:
Fortalezas: {json.dumps(evaluation.get('strengths', []), ensure_ascii=False)}
Versión recomendada: {evaluation.get('improved_version_sample', '')}

INSTRUCCIONES:
Extrae un caso de éxito STAR estructurado:
- title: Título profesional de 4 a 7 palabras del logro (ej. 'Optimización de consultas y reducción de latencia').
- situation_and_task: Contexto y desafío enfrentado (1-2 oraciones).
- action: Acción técnica u organizativa tomada por el candidato (1-2 oraciones).
- result_and_metrics: Resultado cuantificable o impacto logrado (1-2 oraciones).
- key_skills: Lista de 2 a 4 tecnologías o competencias demostradas.

RESPONDE ÚNICAMENTE CON UN JSON:
{{
  "title": "Título del logro",
  "situation_and_task": "...",
  "action": "...",
  "result_and_metrics": "...",
  "key_skills": ["Skill1", "Skill2"]
}}
"""
        try:
            res = llm.generate_json(prompt, system_instruction=system_instruction)
            if res and res.get("title"):
                new_story = LearnedStarStory(
                    id=str(uuid.uuid4()),
                    title=res.get("title", f"Logro en respuesta a: {question[:30]}..."),
                    situation_and_task=res.get("situation_and_task", candidate_answer[:100]),
                    action=res.get("action", candidate_answer),
                    result_and_metrics=res.get("result_and_metrics", evaluation.get("improved_version_sample", "")[:120]),
                    key_skills=res.get("key_skills", []),
                    source=f"interview_simulation ({company})" if company else "interview_simulation",
                    score=score,
                    created_at=datetime.utcnow().isoformat()
                )

                # Avoid duplicate titles
                existing_titles = [s.title.lower() for s in prefs.learned_star_stories]
                if new_story.title.lower() not in existing_titles:
                    prefs.learned_star_stories.insert(0, new_story)
                    # Keep maximum 15 high-impact stories
                    if len(prefs.learned_star_stories) > 15:
                        prefs.learned_star_stories = prefs.learned_star_stories[:15]

                if not prefs.memory_stats:
                    prefs.memory_stats = MemoryStats()
                prefs.memory_stats.total_star_answers_learned += 1
                self._update_maturity(prefs)
                db.save_preferences(prefs)
                return new_story
        except Exception as e:
            logger.error(f"Error learning from STAR answer: {e}")
        return None

    def consolidate_memory(self) -> UserPreferences:
        """
        Deep cross-module memory consolidation:
        Reads CV/Profile, Applications history, Radar feedback, and STAR answers.
        Synthesizes ProfileDNA, STAR stories from CV, refined behavioral insights, and industry patterns.
        """
        profile = db.get_profile()
        applications = db.get_applications()
        feedback = db.get_feedback_history()
        prefs = db.get_preferences()

        system_instruction = (
            "Eres el Arquitecto de Memoria Cognitiva para un Agente Autónomo de Búsqueda de Empleo. "
            "Tu objetivo es sintetizar todo el conocimiento acumulado del candidato (su CV real, vacantes a las "
            "que ha postulado, preferencias que ha demostrado y respuestas de entrevistas) en un modelo mental "
            "preciso que guiará futuras postulaciones automáticas de alto impacto."
        )

        profile_summary = {
            "name": profile.name,
            "headline": profile.headline,
            "summary": profile.summary,
            "skills": profile.technical_skills + profile.soft_skills,
            "experience_count": len(profile.experiences),
            "top_experiences": [
                {
                    "role": exp.role,
                    "company": exp.company,
                    "period": f"{exp.start_date} - {exp.end_date}",
                    "bullets": exp.bullet_achievements[:3] if exp.bullet_achievements else [exp.description[:150]],
                    "technologies": exp.technologies
                }
                for exp in profile.experiences[:4]
            ]
        }

        app_context = [
            {"company": a.company, "title": a.job_title, "ats_score": a.ats_score}
            for a in applications[:6]
        ]

        feedback_context = feedback[-10:] if feedback else []

        prompt = f"""
PERFIL Y EXPERIENCIA DEL CANDIDATO:
{json.dumps(profile_summary, ensure_ascii=False, indent=2)}

HISTORIAL DE POSTULACIONES REALIZADAS:
{json.dumps(app_context, ensure_ascii=False, indent=2)}

HISTORIAL DE INTERACCIONES EN EL RADAR (LIKES / DESCARTES / MOTIVOS):
{json.dumps(feedback_context, ensure_ascii=False, indent=2)}

REGLAS APRENDIDAS PREVIAS:
{json.dumps(prefs.auto_learned_insights, ensure_ascii=False)}

TAREA DE SÍNTESIS COGNITIVA:
1. profile_dna:
   - summary: Resumen ejecutivo conciso (máximo 2 oraciones) de la propuesta de valor única del candidato.
   - seniority_level: Nivel inferido (ej. 'Mid-Senior', 'Senior', 'Tech Lead', 'Staff').
   - core_strengths: Lista de 3 a 5 fortalezas troncales demostrables.
   - communication_tone: Tono característico (ej. 'Ejecutivo, directo y orientado a métricas cuantificables').
2. star_stories:
   - Extrae entre 2 y 4 casos de éxito STAR de la experiencia real del candidato si su CV contiene proyectos medibles.
   - Cada uno con: title, situation_and_task, action, result_and_metrics, key_skills (lista).
3. auto_learned_insights:
   - Entre 3 y 5 reglas claras de preferencia inferidas de su comportamiento y vacantes (ej. 'Prioriza empresas con stack moderno Python/TypeScript', 'Foco en cargos con autonomía técnica', 'Evita ofertas presenciales o sin rango claro').
4. industry_insights:
   - 2 a 3 observaciones sobre los sectores o empresas hacia donde se perfila el candidato (ej. 'Alta compatibilidad con empresas SaaS y Fintech que valoran escalabilidad', 'Palabras clave de alto impacto detectadas: microservicios, CI/CD, arquitecturas cloud').

RESPONDE ÚNICAMENTE CON UN JSON:
{{
  "profile_dna": {{
    "summary": "...",
    "seniority_level": "...",
    "core_strengths": ["...", "..."],
    "communication_tone": "..."
  }},
  "star_stories": [
    {{
      "title": "...",
      "situation_and_task": "...",
      "action": "...",
      "result_and_metrics": "...",
      "key_skills": ["..."]
    }}
  ],
  "auto_learned_insights": [
    "Regla 1",
    "Regla 2"
  ],
  "industry_insights": [
    "Patrón 1",
    "Patrón 2"
  ]
}}
"""
        try:
            res = llm.generate_json(prompt, system_instruction=system_instruction)
            if res:
                # 1. Update Profile DNA
                if res.get("profile_dna"):
                    prefs.profile_dna = ProfileDNA(**res["profile_dna"])

                # 2. Update or supplement STAR Stories from CV
                if res.get("star_stories"):
                    existing_titles = [s.title.lower() for s in prefs.learned_star_stories]
                    for s_data in res["star_stories"]:
                        if s_data.get("title") and s_data["title"].lower() not in existing_titles:
                            story = LearnedStarStory(
                                id=str(uuid.uuid4()),
                                title=s_data.get("title", "Caso de éxito"),
                                situation_and_task=s_data.get("situation_and_task", ""),
                                action=s_data.get("action", ""),
                                result_and_metrics=s_data.get("result_and_metrics", ""),
                                key_skills=s_data.get("key_skills", []),
                                source="cv",
                                score=90,
                                created_at=datetime.utcnow().isoformat()
                            )
                            prefs.learned_star_stories.append(story)

                # 3. Update Insights
                if res.get("auto_learned_insights"):
                    prefs.auto_learned_insights = res["auto_learned_insights"]

                # 4. Update Industry Insights
                if res.get("industry_insights"):
                    prefs.industry_insights = res["industry_insights"]

                # 5. Update Stats
                if not prefs.memory_stats:
                    prefs.memory_stats = MemoryStats()
                prefs.memory_stats.cv_analyzed = len(profile.experiences) > 0
                prefs.memory_stats.total_applications_learned = len(applications)
                prefs.memory_stats.last_consolidated_at = datetime.utcnow().isoformat()
                self._update_maturity(prefs)

                prefs.updated_at = datetime.utcnow().isoformat()
                db.save_preferences(prefs)
                logger.info("Cognitive AI Memory successfully consolidated.")
        except Exception as e:
            logger.error(f"Error during memory consolidation: {e}")

        return prefs

    def _extract_insights(self, history: List[Dict[str, Any]], prefs: UserPreferences) -> List[str]:
        system_instruction = (
            "Eres un agente de aprendizaje de preferencias de carrera laboral. Analiza las acciones "
            "del usuario (empleos con like, empleos descartados, motivos de descarte) y deduce reglas "
            "claras y concisas sobre sus preferencias implícitas."
        )

        prompt = f"""
HISTORIAL DE ACCIONES DEL USUARIO (Últimas interacciones):
{json.dumps(history[-10:], ensure_ascii=False, indent=2)}

REGLAS APRENDIDAS PREVIAMENTE:
{json.dumps(prefs.auto_learned_insights, ensure_ascii=False)}

Deduce entre 3 y 5 reglas de preferencia aprendidas en lenguaje claro (e.g., 'Prioriza vacantes remotas en dólares', 'Prefiere roles de arquitectura en Python/FastAPI', 'Descarta ofertas sin flexibilidad horaria').

RESPONDE ÚNICAMENTE CON UN JSON:
{{
  "insights": [
    "Regla de preferencia 1",
    "Regla de preferencia 2"
  ]
}}
"""
        res = llm.generate_json(prompt, system_instruction=system_instruction)
        return res.get("insights", prefs.auto_learned_insights)

    def _update_maturity(self, prefs: UserPreferences):
        """Calculates dynamic maturity percentage of the AI Memory."""
        score = 25  # Base calibration
        if prefs.memory_stats and prefs.memory_stats.cv_analyzed:
            score += 25
        if prefs.memory_stats and prefs.memory_stats.total_applications_learned > 0:
            score += min(20, prefs.memory_stats.total_applications_learned * 7)
        if len(prefs.learned_star_stories) > 0:
            score += min(20, len(prefs.learned_star_stories) * 6)
        if len(prefs.auto_learned_insights) >= 3:
            score += 10

        if not prefs.memory_stats:
            prefs.memory_stats = MemoryStats()
        prefs.memory_stats.maturity_percentage = min(100, score)

    def chat_and_learn(self, message: str, chat_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Nexus — Asistente de Perfil Profesional & Búsqueda de Empleo.
        Friendly, deterministic, token-efficient, zero-hallucinations, and anti-jailbreak protected.
        Supports conversational memory ingestion and Radar job querying.
        """
        profile = db.get_profile()
        prefs = db.get_preferences()
        history = chat_history or []

        msg_lower = message.lower().strip()

        # ── 1. Anti-Jailbreak Guardrail ───────────────────────────────────────────
        jailbreak_patterns = [
            "ignore previous", "ignora las instrucciones", "ignora todas las instrucciones",
            "jailbreak", "modo desarrollador", "developer mode", "finge que eres", "dan mode",
            "rompe tu programacion", "cambia tus reglas", "actua como", "olvida tus reglas"
        ]
        if any(p in msg_lower for p in jailbreak_patterns):
            refusal_msg = (
                "Como Nexus, mi propósito está estrictamente enfocado en optimizar tu perfil profesional, "
                "estructurar tus logros de carrera y ayudarte en la búsqueda de empleo. "
                "No puedo realizar tareas fuera de ese ámbito. ¿Qué proyecto o vacante de tu Radar te gustaría que revisemos?"
            )
            return {
                "reply": refusal_msg,
                "has_new_story": False,
                "new_story": None,
                "new_insights": [],
                "new_deal_breakers": [],
                "preferences": prefs.model_dump()
            }

        # ── 2. Compact Radar Jobs Context (Token-Optimized) ──────────────────────
        job_intent_keywords = [
            "oferta", "ofertas", "empleo", "empleos", "vacante", "vacantes",
            "trabajo", "trabajos", "radar", "postular", "postulaciones",
            "remoto", "remota", "empresa", "buscar", "busqueda", "salario"
        ]
        is_job_query = any(k in msg_lower for k in job_intent_keywords)

        relevant_jobs_section = ""
        if is_job_query:
            all_jobs = db.get_jobs()
            if all_jobs:
                # Rank jobs by keyword match with user query or highest fit
                scored_jobs = []
                for j in all_jobs:
                    j_text = f"{j.title} {j.company} {j.location} {j.description or ''}".lower()
                    words = [w for w in msg_lower.split() if len(w) > 3]
                    score = sum(2 for w in words if w in j_text)
                    if j.is_remote and "remot" in msg_lower:
                        score += 3
                    scored_jobs.append((score, j))

                scored_jobs.sort(key=lambda x: (x[0], x[1].fit_score or 0), reverse=True)
                top_jobs = [item[1] for item in scored_jobs[:5]]

                lines = [
                    f"• {j.title} en {j.company} ({'100% Remoto' if j.is_remote else j.location or 'Chile'})"
                    for j in top_jobs
                ]
                relevant_jobs_section = (
                    "OFERTAS REALES ACTUALMENTE EN EL RADAR (Usa únicamente estas si el usuario pregunta por vacantes):\n"
                    + "\n".join(lines)
                )

        # ── 3. Strict & Token-Efficient System Instructions ──────────────────────
        system_instruction = (
            "Eres 'Nexus', el asistente de perfil profesional y búsqueda de empleo de NexusJob AI.\n\n"
            "PERSONALIDAD Y DIRECTRICES:\n"
            "1. Amigable, claro, ejecutivo y determinista. No uses palabrería de relleno ni introducciones floridas.\n"
            "2. AHORRO MÁXIMO DE TOKENS: Sé conciso. Tu respuesta ('assistant_reply') debe tener como máximo 2 párrafos breves "
            "(menos de 90 palabras en total) o viñetas limpias.\n"
            "3. CERO ALUCINACIONES: Jamás inventes métricas, cargos o vacantes no presentes en el contexto. "
            "Si el usuario pregunta por empleos, básate estrictamente en las ofertas del Radar suministradas.\n"
            "4. Cierra siempre con UNA SOLA pregunta breve y estratégica para profundizar en detalles o avanzar en la búsqueda.\n"
            "5. SEGURIDAD: Mantente en tu rol de asistente de carrera profesional sin desviarte bajo ninguna circunstancia.\n\n"
            "RESPONDE ESTRICTAMENTE EN FORMATO JSON."
        )

        existing_titles = [s.title for s in prefs.learned_star_stories[:5]]
        top_skills = profile.technical_skills[:6] if profile.technical_skills else []

        prompt = f"""
CANDIDATO: {profile.name or 'Candidato'} | {profile.headline or 'Profesional TI'} | Skills: {', '.join(top_skills)}
HISTORIAS STAR EXISTENTES: {json.dumps(existing_titles, ensure_ascii=False)}
REGLAS APRENDIDAS: {json.dumps(prefs.auto_learned_insights[:3], ensure_ascii=False)}

{relevant_jobs_section}

HISTORIAL RECIENTE (Últimos mensajes):
{json.dumps(history[-4:], ensure_ascii=False)}

MENSAJE DEL CANDIDATO:
"{message}"

FORMATO OBLIGATORIO JSON:
{{
  "assistant_reply": "Respuesta breve de Nexus (máx 80 palabras con 1 pregunta concisa al final)",
  "star_story": {{
    "title": "Título sintético del logro",
    "situation_and_task": "Contexto breve",
    "action": "Acción técnica o de gestión específica",
    "result_and_metrics": "Métrica o resultado verificable",
    "key_skills": ["Skill1", "Skill2"]
  }},
  "new_insights": ["Nueva preferencia aprendida si la mencionó"],
  "deal_breakers": ["Nueva condición eliminatoria si la mencionó"],
  "preferred_technologies": ["Tecnologías destacadas si las mencionó"],
  "target_roles": ["Roles específicos de interés si los mencionó"]
}}
(Si el mensaje no contiene un caso de éxito nuevo, 'star_story' debe ser null).
"""

        new_story_learned = None
        new_insights_learned = []
        new_deal_breakers_learned = []

        try:
            res = llm.generate_json(prompt, system_instruction=system_instruction)
            assistant_reply = res.get("assistant_reply") or "Entendido. He registrado la información en tu perfil profesional."

            # Process STAR Story if detected
            story_data = res.get("star_story")
            if isinstance(story_data, dict) and story_data.get("title") and story_data.get("action"):
                title_lower = story_data["title"].strip().lower()
                is_duplicate = any(
                    title_lower in s.title.lower() or s.title.lower() in title_lower
                    for s in prefs.learned_star_stories
                )

                if not is_duplicate:
                    new_story = LearnedStarStory(
                        id=str(uuid.uuid4())[:8],
                        title=story_data["title"].strip(),
                        situation_and_task=story_data.get("situation_and_task", ""),
                        action=story_data["action"].strip(),
                        result_and_metrics=story_data.get("result_and_metrics", ""),
                        key_skills=story_data.get("key_skills", []),
                        source="nexus_assistant",
                        score=95,
                        created_at=datetime.utcnow().isoformat()
                    )
                    prefs.learned_star_stories.insert(0, new_story)
                    new_story_learned = new_story.model_dump()
                    if not prefs.memory_stats:
                        prefs.memory_stats = MemoryStats()
                    prefs.memory_stats.total_star_answers_learned += 1

            # Process Insights
            for ins in res.get("new_insights", []):
                if ins and ins not in prefs.auto_learned_insights:
                    prefs.auto_learned_insights.insert(0, ins)
                    new_insights_learned.append(ins)

            # Process Deal Breakers
            for db_item in res.get("deal_breakers", []):
                if db_item and db_item not in prefs.deal_breakers:
                    prefs.deal_breakers.append(db_item)
                    new_deal_breakers_learned.append(db_item)

            # Process Preferred Tech
            for tech in res.get("preferred_technologies", []):
                if tech and tech not in prefs.preferred_technologies:
                    prefs.preferred_technologies.append(tech)

            # Process Target Roles
            for role in res.get("target_roles", []):
                if role and role not in prefs.target_roles:
                    prefs.target_roles.append(role)

            self._update_maturity(prefs)
            db.save_preferences(prefs)

            return {
                "reply": assistant_reply,
                "has_new_story": bool(new_story_learned),
                "new_story": new_story_learned,
                "new_insights": new_insights_learned,
                "new_deal_breakers": new_deal_breakers_learned,
                "preferences": prefs.model_dump()
            }

        except Exception as e:
            # Deterministic, compact offline fallback
            logger.warning(f"Nexus LLM chat fallback: {e}")
            if is_job_query:
                all_jobs = db.get_jobs()
                top = all_jobs[:3]
                jobs_summary = "\n".join([f"• {j.title} en {j.company}" for j in top])
                reply = (
                    f"En tu Radar tienes actualmente {len(all_jobs)} oportunidades indexadas. "
                    f"Entre las más destacadas:\n{jobs_summary}\n¿Deseas evaluar tu ajuste con alguna de ellas?"
                )
            else:
                reply = (
                    "He registrado tu mensaje en tu memoria cognitiva. "
                    "Para maximizar el impacto de tus postulaciones, ¿cuál fue el resultado o métrica concreta de este proyecto?"
                )

            return {
                "reply": reply,
                "has_new_story": False,
                "new_story": None,
                "new_insights": [],
                "new_deal_breakers": [],
                "preferences": prefs.model_dump()
            }
            if ("logro" in msg_lower or "proyecto" in msg_lower or "implement" in msg_lower) and len(message) > 40:
                heuristic_story = LearnedStarStory(
                    id=str(uuid.uuid4())[:8],
                    title=f"Experiencia: {message[:35]}...",
                    situation_and_task="Registro mediante conversación interactiva",
                    action=message,
                    result_and_metrics="Pendiente de métricas detalladas",
                    key_skills=["Liderazgo", "Desarrollo"],
                    source="chat_coach",
                    score=85,
                    created_at=datetime.utcnow().isoformat()
                )
                prefs.learned_star_stories.insert(0, heuristic_story)
                self._update_maturity(prefs)
                db.save_preferences(prefs)

            return {
                "reply": f"He registrado tu mensaje en la memoria cognitiva. {('¡Detecté y guardé una nueva historia de éxito!' if heuristic_story else '¿Te gustaría agregar métricas específicas sobre este desafío?')}",
                "has_new_story": bool(heuristic_story),
                "new_story": heuristic_story.model_dump() if heuristic_story else None,
                "new_insights": [],
                "new_deal_breakers": [],
                "preferences": prefs.model_dump()
            }

preference_learner = PreferenceLearner()
