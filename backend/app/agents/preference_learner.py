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
        Opi — Copiloto Profesional de Oportia Jobs IA.
        Friendly, deterministic, token-efficient, zero-hallucinations, and anti-jailbreak protected.
        Supports conversational memory ingestion and Radar job querying.
        """
        profile = db.get_profile()
        prefs = db.get_preferences()
        history = chat_history or []

        msg_lower = message.lower().strip()

        # ── 1. Strict Security, Code Tampering & Anti-Jailbreak Guardrail ───────
        prohibited_intents = [
            "ignore previous", "ignora las instrucciones", "ignora todas las instrucciones",
            "jailbreak", "modo desarrollador", "developer mode", "finge que eres", "dan mode",
            "rompe tu programacion", "cambia tus reglas", "actua como", "olvida tus reglas",
            "escribe codigo", "escribe un codigo", "genera codigo", "codigo python", "script python",
            "crea un script", "automatiza con python", "automatizacion con python", "insertar codigo",
            "modifica el codigo", "editar el codigo", "cambiar funciones", "hack", "hackear",
            "hackeo", "exploit", "vulnerar", "inyeccion de codigo", "reverse engineering",
            "crackear", "bot automatico", "selenium", "playwright", "beautifulsoup script"
        ]
        if any(p in msg_lower for p in prohibited_intents):
            refusal_msg = (
                "🛡️ Como Opi, mi rol está estrictamente delimitado a la asesoría de empleabilidad, "
                "optimización de tu perfil/CV, refinamiento de tu ADN profesional y preparación para entrevistas "
                "dentro de las capacidades oficiales de Oportia Jobs IA.\n\n"
                "Tengo terminantemente prohibido generar código de programación, sugerir scripts o automatizaciones externas "
                "(como scripts en Python), editar el código fuente del sistema o hacer alusiones a vulneraciones o hackeos.\n\n"
                "¿Deseas que revisemos tu Propuesta de Valor Sintetizada, analicemos las ofertas de tu Radar o preparemos una entrevista?"
            )
            return {
                "reply": refusal_msg,
                "has_new_story": False,
                "new_story": None,
                "new_insights": [],
                "new_deal_breakers": [],
                "quick_replies": ["Revisar Propuesta de Valor", "Ver vacantes en Radar", "¿Cómo subir mi Fit Score?"],
                "preferences": prefs.model_dump()
            }

        # Check for intent to update Value Proposition / Professional DNA
        value_prop_keywords = [
            "propuesta de valor", "propuesta de valor sintetizada", "adn profesional",
            "sintetizar mi perfil", "actualizar mi resumen de adn", "actualizar propuesta de valor",
            "mejorar propuesta de valor", "cambiar propuesta de valor", "redactar mi propuesta de valor",
            "definir mi propuesta de valor"
        ]
        is_value_prop_intent = any(k in msg_lower for k in value_prop_keywords)

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

        # ── 3. Strict & Token-Efficient System Instructions with Proactive Coaching ──
        system_instruction = (
            "Eres 'Opi', el copiloto inteligente de perfil profesional, empleabilidad y desarrollo de carrera de Oportia Jobs IA.\n\n"
            "REGLAS DE ORO DE SEGURIDAD Y DELIMITACIÓN ESTRICTA (INVIOLABLES):\n"
            "1. PROHIBICIÓN ABSOLUTA DE GENERAR CÓDIGO: Jamás redactes código de programación en ningún lenguaje "
            "(Python, JavaScript, Shell, Bash, SQL, C++, etc.), ni fragmentos ejecutables, ni scripts de automatización externa. "
            "Opi no es un asistente de programación ni un generador de scripts.\n"
            "2. PROHIBICIÓN DE MODIFICAR CÓDIGO FUENTE O ALTERAR FUNCIONES: Tienes terminantemente prohibido sugerir ediciones al código "
            "fuente de Oportia Jobs IA, proponer parches o alterar sus funciones predeterminadas.\n"
            "3. PROHIBICIÓN DE ALUSIONES A HACKEOS O EVASIONES: No hagas ninguna alusión a hackeos, vulnerabilidades, bypasses, "
            "bots automáticos ni técnicas de elusión de seguridad.\n"
            "4. ACTUALIZACIÓN DE PROPUESTA DE VALOR SINTETIZADA: Si el candidato solicita actualizar, refinar o corregir su "
            "'Propuesta de Valor Sintetizada' o ADN Profesional, analiza sus antecedentes y redacta el texto profesional en el campo "
            "'updated_value_proposition'. Describe en tu respuesta la nueva redacción y explica cómo potencia su impacto ante reclutadores. "
            "NUNCA ofrezcas scripts ni automatizaciones con Python.\n\n"
            "DIRECTRICES DE CONTINUIDAD Y COACHING PROACTIVO:\n"
            "1. MEMORIA DE CONTEXTO ACTIVA (CRÍTICO): Mantén estricta memoria de todas las preguntas y respuestas previas "
            "registradas en el 'HISTORIAL DE LA CONVERSACIÓN PREVIA'. Si el candidato hace preguntas de seguimiento "
            "(como 'y de esos?', 'cuál me recomiendas?', 'por qué?', 'recuerdas lo que te dije de mi rol?', "
            "'el segundo que nombraste', 'y respecto al salario?'), debes responder conectando directamente con el contexto "
            "de las respuestas y preguntas anteriores sin perder el hilo ni reiniciar la conversación.\n"
            "2. REGLA DEL VALOR PRIMERO: Responde primero y con máxima claridad y utilidad a la consulta o duda que planteó el candidato.\n"
            "3. COACHING PROACTIVO DE MADUREZ (MÉTODO STAR): Si detectas brechas de memoria pendientes (experiencias laborales sin logros cuantificados "
            "o preferencias no definidas), incluye al final de tu respuesta una pregunta breve, amigable y opcional orientada a descubrir "
            "un logro concreto con métricas verificables (ahorro, tiempo, equipo, volumen) o una condición clave. No suenes a interrogatorio; "
            "hazlo como un mentor que busca potenciar su Fit Score y su impacto ante reclutadores.\n"
            "4. RESPUESTAS RÁPIDAS ('quick_replies'): Genera siempre entre 2 y 4 opciones o respuestas sugeridas breves (frases concisas de 2 a 5 palabras) "
            "para que el candidato pueda pulsar con un solo toque desde su móvil o computador para responder o avanzar.\n"
            "5. CERO ALUCINACIONES: Basa tus afirmaciones estrictamente en los antecedentes reales del candidato y en las ofertas reales del Radar provistas.\n"
            "6. SEGURIDAD: Mantente 100% en tu rol de asistente de empleabilidad y desarrollo profesional.\n\n"
            "RESPONDE ESTRICTAMENTE EN FORMATO JSON."
        )

        existing_titles = [s.title for s in prefs.learned_star_stories[:5]]
        top_skills = profile.technical_skills[:8] if profile.technical_skills else []

        # Proactive Gap Analysis (To elevate AI Memory Maturity & Profile Strength)
        profile_gaps = []
        existing_story_titles = " ".join([s.title.lower() for s in prefs.learned_star_stories])
        
        untapped_exp = None
        for exp in (profile.experiences or []):
            if exp.company and exp.company.lower() not in existing_story_titles:
                untapped_exp = exp
                break

        if untapped_exp:
            profile_gaps.append(
                f"Oportunidad STAR: Falta cuantificar logros en '{untapped_exp.company}' (Cargo: {untapped_exp.role}). "
                f"Si es oportuno, invita amablemente al candidato a compartir qué reto o métrica destaca de esa etapa."
            )
        elif len(prefs.learned_star_stories) < 3:
            profile_gaps.append(
                "Oportunidad STAR: El perfil necesita historias de impacto con métricas verificables (ahorro de costos, optimización de tiempo, tamaño de equipo)."
            )

        if not prefs.deal_breakers:
            profile_gaps.append(
                "Oportunidad de Preferencia: Aún no se han definido 'deal-breakers' (límites innegociables: turnos rotativos, presencialidad 100% o viajes excesivos)."
            )

        gaps_section = ""
        if profile_gaps:
            gaps_section = "BRECHAS DE MEMORIA Y MADUREZ DETECTADAS (Para coaching proactivo):\n" + "\n".join([f"• {g}" for g in profile_gaps])

        # Build chronological dialogue history from recent turns (up to 20 messages / 10 turns)
        dialogue_turns = []
        for item in history[-20:]:
            r = item.get("role", "user")
            c = (item.get("content") or "").strip()
            if not c:
                continue
            speaker = "Candidato" if r == "user" else "Opi (Tú)"
            dialogue_turns.append(f"{speaker}: {c}")

        conversation_transcript = "\n".join(dialogue_turns) if dialogue_turns else "(Inicio de conversación — esta es la primera pregunta)"

        prompt = f"""
INFORMACIÓN DEL CANDIDATO:
- Nombre: {profile.name or 'Candidato'}
- Profesión / Titular: {profile.headline or profile.primary_profession or 'Profesional'}
- Años de Experiencia: {profile.years_of_experience}
- Competencias Técnicas Clave: {', '.join(top_skills)}
- Región / Cobertura: {profile.location or 'Chile'}
- ADN Profesional Actual: "{prefs.profile_dna.summary if prefs.profile_dna else 'No especificado'}"
- Preferencias Registradas: {json.dumps(prefs.auto_learned_insights[:5], ensure_ascii=False)}

{relevant_jobs_section}

{gaps_section}

=======================================================
HISTORIAL DE LA CONVERSACIÓN PREVIA (Preguntas y Respuestas anteriores):
=======================================================
{conversation_transcript}

=======================================================
NUEVO MENSAJE DEL CANDIDATO (Responde con memoria contextual de lo conversado):
=======================================================
"{message}"

FORMATO OBLIGATORIO JSON (ESTRICTAMENTE EN PROSA PROFESIONAL, NUNCA CÓDIGO NI SCRIPTS):
{{
  "assistant_reply": "Tu respuesta como Opi (en prosa profesional, resolviendo primero la consulta y cerrando con una pregunta de coaching proactivo si aplica. NUNCA generes código)",
  "quick_replies": ["Opción rápida 1", "Opción rápida 2", "Opción rápida 3"],
  "updated_value_proposition": "Nueva propuesta de valor sintetizada en prosa profesional si el usuario solicitó actualizarla o corregirla; de lo contrario null",
  "updated_core_strengths": ["Fortaleza 1", "Fortaleza 2"],
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
(Si el mensaje no contiene un caso de éxito nuevo, 'star_story' debe ser null. Si no solicitó actualizar la propuesta de valor, 'updated_value_proposition' debe ser null).
"""

        new_story_learned = None
        new_insights_learned = []
        new_deal_breakers_learned = []

        try:
            res = llm.generate_json(prompt, system_instruction=system_instruction)
            if not res or not res.get("assistant_reply"):
                raise ValueError("Respuesta vacía o formato inválido del motor de IA")
            assistant_reply = str(res.get("assistant_reply", "")).strip()

            # Output Sanitizer: Strip any unintended code blocks or python script suggestions
            if "```" in assistant_reply or "import " in assistant_reply or "def " in assistant_reply:
                assistant_reply = re.sub(r'```[\s\S]*?```', '', assistant_reply).strip()
                cleaned_lines = [l for l in assistant_reply.split('\n') if not l.strip().startswith(('import ', 'from ', 'def ', 'class ', 'pip install', 'python '))]
                assistant_reply = '\n'.join(cleaned_lines).strip()
                if not assistant_reply:
                    assistant_reply = "He analizado tus antecedentes profesionales y actualizado tu información en tu perfil. ¿Qué otro aspecto te gustaría revisar?"

            # Process Updated Value Proposition (ProfileDNA)
            updated_vp = res.get("updated_value_proposition")
            if updated_vp and isinstance(updated_vp, str) and len(updated_vp.strip()) > 10:
                if not prefs.profile_dna:
                    prefs.profile_dna = ProfileDNA()
                prefs.profile_dna.summary = updated_vp.strip()
                strengths = res.get("updated_core_strengths")
                if isinstance(strengths, list) and strengths:
                    cleaned_str = [str(s).strip() for s in strengths if str(s).strip()]
                    if cleaned_str:
                        prefs.profile_dna.core_strengths = cleaned_str[:5]
                self._update_maturity(prefs)
                db.save_preferences(prefs)

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
                        source="opi_copilot",
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

            # Extract proactive quick replies if generated by LLM
            raw_qr = res.get("quick_replies", [])
            quick_replies = []
            if isinstance(raw_qr, list):
                quick_replies = [str(q).strip() for q in raw_qr if str(q).strip()][:4]

            if not quick_replies:
                if profile_gaps:
                    quick_replies = ["🎯 Cuantificar este logro", "🚫 Definir límites laborales", "¿Cómo subir mi Fit Score?"]
                else:
                    quick_replies = ["💼 Ver ofertas afines", "📈 Optimizar mi resumen", "🎯 Explorar otro logro"]

            return {
                "reply": assistant_reply,
                "has_new_story": bool(new_story_learned),
                "new_story": new_story_learned,
                "new_insights": new_insights_learned,
                "new_deal_breakers": new_deal_breakers_learned,
                "quick_replies": quick_replies,
                "preferences": prefs.model_dump()
            }

        except Exception as e:
            # Deterministic, context-aware offline fallback
            logger.warning(f"Opi LLM chat fallback: {e}")
            
            # Detect context from previous messages if available
            last_user_message = ""
            for prev_m in reversed(history):
                if prev_m.get("role") == "user":
                    last_user_message = prev_m.get("content", "").strip()
                    break

            if is_value_prop_intent:
                # Deterministic synthesis of Value Proposition from candidate profile
                skills_summary = ", ".join(top_skills[:3]) if top_skills else "gestión tecnológica y arquitectura de soluciones"
                exp_years = profile.years_of_experience or 7
                title = profile.headline or profile.primary_profession or "Ingeniero y Líder Profesional"
                new_vp = (
                    f"{title} con más de {exp_years} años de trayectoria demostrable, especializado en {skills_summary}. "
                    f"Orientado a la optimización de procesos, liderazgo de proyectos estratégicos y generación de impacto operativo medible."
                )
                if not prefs.profile_dna:
                    prefs.profile_dna = ProfileDNA()
                prefs.profile_dna.summary = new_vp
                self._update_maturity(prefs)
                db.save_preferences(prefs)
                reply = (
                    f"He analizado tus antecedentes y actualizado exitosamente tu **Propuesta de Valor Sintetizada** en tu ADN profesional:\n\n"
                    f"> \"{new_vp}\"\n\n"
                    f"Esta síntesis ya quedó integrada en tu memoria cognitiva y servirá de base para alinear el Comité de Selección, "
                    f"adaptar tus cartas de presentación y calibrar tu Fit Score. ¿Deseas enfatizar alguna especialidad o logro adicional?"
                )
                quick_replies = ["Guardar y continuar", "Enfatizar liderazgo", "Buscar vacantes afines"]
            elif is_job_query:
                all_jobs = db.get_jobs()
                top = all_jobs[:3]
                jobs_summary = "\n".join([f"• {j.title} en {j.company} ({'100% Remoto' if j.is_remote else j.location or 'Chile'})" for j in top])
                reply = (
                    f"Considerando tu búsqueda, en tu Radar tienes {len(all_jobs)} oportunidades indexadas. "
                    f"Entre las más compatibles con tu perfil:\n{jobs_summary}\n"
                    f"¿Te gustaría que analicemos el ajuste de tu CV para alguna de ellas?"
                )
                quick_replies = ["Revisar requisitos de la primera", "Buscar empleos 100% remotos", "¿Cómo subir mi Fit Score?"]
            elif "star" in msg_lower or "logro" in msg_lower or "desafío" in msg_lower:
                reply = (
                    "Continuando con el método STAR para enriquecer tu memoria: "
                    "¿Qué acciones clave tomaste frente a ese reto y cuál fue el resultado o métrica concreta que alcanzaste?"
                )
                quick_replies = ["Reduje costos en un 20%", "Optimicé tiempos a la mitad", "Lideré equipo de 6 personas"]
            elif last_user_message and len(history) > 1:
                reply = (
                    f"Respecto a lo que veníamos conversando: he integrado tu respuesta en el contexto de tu perfil. "
                    f"¿Deseas que enfoquemos esta experiencia hacia el titular de tu CV o para una vacante específica del Radar?"
                )
                quick_replies = ["Aplicar a titular de mi CV", "Buscar vacantes afines", "Añadir más detalles"]
            else:
                reply = (
                    "He registrado tu mensaje en tu memoria cognitiva. "
                    "Para maximizar el impacto de tu perfil ante los reclutadores, ¿qué desafío o logro principal te gustaría estructurar a continuación?"
                )
                quick_replies = ["🎯 Extraer logro STAR de mi CV", "💼 Ver vacantes en mi Radar", "🚫 Definir límites laborales"]

            heuristic_story = None
            if ("logro" in msg_lower or "proyecto" in msg_lower or "implement" in msg_lower) and len(message) > 40:
                heuristic_story = LearnedStarStory(
                    id=str(uuid.uuid4())[:8],
                    title=f"Experiencia: {message[:35]}...",
                    situation_and_task="Registro mediante conversación interactiva",
                    action=message,
                    result_and_metrics="Pendiente de métricas detalladas",
                    key_skills=top_skills[:3] or ["Liderazgo", "Gestión"],
                    source="chat_coach",
                    score=85,
                    created_at=datetime.utcnow().isoformat()
                )
                prefs.learned_star_stories.insert(0, heuristic_story)
                self._update_maturity(prefs)
                db.save_preferences(prefs)

            return {
                "reply": reply,
                "has_new_story": bool(heuristic_story),
                "new_story": heuristic_story.model_dump() if heuristic_story else None,
                "new_insights": [],
                "new_deal_breakers": [],
                "quick_replies": quick_replies,
                "preferences": prefs.model_dump()
            }

preference_learner = PreferenceLearner()
