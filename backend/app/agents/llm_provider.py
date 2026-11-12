import json
import logging
import os
from typing import Optional, Dict, Any
from app.config import settings
from app.agents.models import DEFAULT_GEMINI_MODEL, DEFAULT_OPENAI_MODEL, DEFAULT_CLAUDE_MODEL
from app.agents.llm_context import current_llm_credentials

logger = logging.getLogger(__name__)

class UnifiedLLMProvider:
    def __init__(self):
        self._gemini_client = None
        self._init_clients()

    def _init_clients(self):
        # Initialize Google GenAI client if key is present
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        if api_key:
            try:
                from google import genai
                self._gemini_client = genai.Client(api_key=api_key)
                logger.info("Google GenAI client initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai client: {e}")
                self._gemini_client = None

    def update_keys(self, provider: str, api_key: str, model_name: Optional[str] = None):
        if provider == "gemini":
            settings.GEMINI_API_KEY = api_key
            if model_name:
                settings.GEMINI_MODEL = model_name
            os.environ["GEMINI_API_KEY"] = api_key
            self._init_clients()
        elif provider == "openai":
            settings.OPENAI_API_KEY = api_key
            if model_name:
                settings.OPENAI_MODEL = model_name
        elif provider == "claude":
            settings.ANTHROPIC_API_KEY = api_key
            if model_name:
                settings.CLAUDE_MODEL = model_name
        settings.DEFAULT_PROVIDER = provider

    def reset_provider(self):
        """Wipes active API clients and memory instances."""
        self._gemini_client = None
        settings.purge_keys()

    def generate_text(self, prompt: str, system_instruction: Optional[str] = None, provider: Optional[str] = None) -> str:
        creds = current_llm_credentials.get()
        prov = (creds.provider if creds else (provider or settings.DEFAULT_PROVIDER)).lower()

        # 1. Google Gemini
        if prov == "gemini":
            api_key = (creds.api_key if creds else (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")))
            if api_key:
                import time
                try:
                    from google import genai
                    client = genai.Client(api_key=api_key)
                except Exception as e:
                    logger.warning(f"Failed to create ephemeral genai client: {e}")
                    client = self._gemini_client

                if client:
                    primary_model = (creds.model_name if creds and creds.model_name else None) or settings.GEMINI_MODEL or DEFAULT_GEMINI_MODEL

                    # Resilience chain with active models
                    models_to_try = [primary_model]
                    for candidate in [DEFAULT_GEMINI_MODEL, "gemini-1.5-flash", "gemini-2.5-flash", "gemini-3.5-flash"]:
                        if candidate not in models_to_try:
                            models_to_try.append(candidate)

                    last_err = None
                    for candidate_model in models_to_try:
                        try:
                            contents = prompt
                            config = {}
                            if system_instruction:
                                config["system_instruction"] = system_instruction
                            
                            response = client.models.generate_content(
                                model=candidate_model,
                                contents=contents,
                                config=config if config else None
                            )
                            if response and response.text:
                                return response.text
                        except Exception as e:
                            last_err = e
                            err_str = str(e)
                            logger.warning(f"Error calling Gemini model '{candidate_model}': {err_str}. Trying fallback...")
                            if "503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str:
                                time.sleep(1.0)

                    logger.error(f"All Gemini models in fallback chain failed. Last error: {last_err}")

        # 2. OpenAI
        elif prov == "openai":
            api_key = (creds.api_key if creds else (settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")))
            if api_key:
                try:
                    import httpx
                    model = (creds.model_name if creds and creds.model_name else None) or settings.OPENAI_MODEL or DEFAULT_OPENAI_MODEL
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    messages = []
                    if system_instruction:
                        messages.append({"role": "system", "content": system_instruction})
                    messages.append({"role": "user", "content": prompt})
                    
                    resp = httpx.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers=headers,
                        json={
                            "model": model,
                            "messages": messages,
                            "temperature": 0.3
                        },
                        timeout=60.0
                    )
                    if resp.status_code == 200:
                        return resp.json()["choices"][0]["message"]["content"]
                except Exception as e:
                    logger.error(f"Error calling OpenAI: {e}")

        # 3. Anthropic Claude
        elif prov == "claude":
            api_key = (creds.api_key if creds else (settings.ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY", "")))
            if api_key:
                try:
                    import httpx
                    model = (creds.model_name if creds and creds.model_name else None) or settings.CLAUDE_MODEL or DEFAULT_CLAUDE_MODEL
                    headers = {
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": model,
                        "max_tokens": 4096,
                        "messages": [{"role": "user", "content": prompt}]
                    }
                    if system_instruction:
                        payload["system"] = system_instruction
                    resp = httpx.post(
                        "https://api.anthropic.com/v1/messages",
                        headers=headers,
                        json=payload,
                        timeout=60.0
                    )
                    if resp.status_code == 200:
                        return resp.json()["content"][0]["text"]
                except Exception as e:
                    logger.error(f"Error calling Claude: {e}")

        # Fallback heuristic generator when keys are not configured
        return self._heuristic_fallback(prompt)

    def generate_json(self, prompt: str, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        enhanced_prompt = f"{prompt}\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido, sin bloques de código markdown ni texto adicional."
        raw_text = self.generate_text(enhanced_prompt, system_instruction=system_instruction)
        
        # Clean potential markdown fences
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except Exception as e:
            # Try to find JSON substring
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    return json.loads(cleaned[start:end+1])
                except Exception:
                    pass
            logger.warning(f"Could not parse JSON from LLM: {e}. Raw: {raw_text[:200]}")
            return {}

    def _heuristic_fallback(self, prompt: str) -> str:
        """
        Graceful offline heuristic simulator so user can preview and test
        before entering their Gemini/OpenAI/Claude API keys.
        """
        prompt_lower = prompt.lower()

        # 1. Parsing CV - return empty dict to let deterministic_cv_parser handle true candidate content
        if "texto de currículum" in prompt_lower or "candidato" in prompt_lower and "technical_skills" in prompt_lower:
            return "{}"

        # 2. Comité de Evaluación IA (Fit Evaluation)
        elif "evaluar ajuste" in prompt_lower or "fit" in prompt_lower or "overall_score" in prompt_lower or "comité de evaluación" in prompt_lower or "committee_evaluations" in prompt_lower:
            return json.dumps({
                "committee_evaluations": [
                    {
                        "role_id": "rrhh",
                        "role_name": "Reclutador RR. HH.",
                        "score": 88,
                        "weight_percentage": 25,
                        "justification": "Formación y años de trayectoria plenamente compatibles. Coherencia en la progresión de responsabilidades y estabilidad laboral.",
                        "strengths": ["Trayectoria profesional sólida y coherente", "Formación académica y certificaciones afines"],
                        "gaps": ["Revisar detalles específicos de disponibilidad contractual"],
                        "key_question": "¿Este candidato cumple con el perfil general que estamos buscando?",
                        "question_verdict": "Cumple ampliamente con el perfil general y requisitos transversales."
                    },
                    {
                        "role_id": "hiring_manager",
                        "role_name": "Jefe Contratante (Hiring Manager)",
                        "score": 84,
                        "weight_percentage": 25,
                        "justification": "Demuestra capacidad de resolución, toma de decisiones y solvencia en proyectos complejos con autonomía.",
                        "strengths": ["Evidencia de proyectos con impacto medible", "Autonomía en resolución de problemas"],
                        "gaps": ["Detallar mayor evidencia en liderazgo de equipos distribuidos"],
                        "key_question": "¿Contrataría a esta persona para resolver las necesidades de mi área?",
                        "question_verdict": "Sí, aporta solvencia operativa y resolvería las prioridades inmediatas del equipo."
                    },
                    {
                        "role_id": "technical",
                        "role_name": "Evaluador Técnico Especialista",
                        "score": 86,
                        "weight_percentage": 25,
                        "justification": "Dominio contrastado del stack principal y buenas prácticas arquitectónicas. Brechas menores en herramientas periféricas.",
                        "strengths": ["Fuerte conocimiento técnico en herramientas centrales", "Buenas prácticas y metodologías ágiles"],
                        "gaps": ["Herramienta interna secundaria a nivelar en inducción"],
                        "key_question": "¿Tiene los conocimientos y la experiencia técnica necesarios para desempeñar este trabajo?",
                        "question_verdict": "Posee la experiencia y conocimientos técnicos requeridos para desempeño productivo."
                    },
                    {
                        "role_id": "ats",
                        "role_name": "Especialista ATS",
                        "score": 92,
                        "weight_percentage": 15,
                        "justification": "Estructura documental nítida, encabezados estándar y correspondencia alta con las palabras clave solicitadas.",
                        "strengths": ["Alta legibilidad para parsers automatizados", "Palabras clave esenciales identificables"],
                        "gaps": ["Incorporar un par de términos técnicos específicos de la descripción"],
                        "key_question": "¿El currículum comunica correctamente la experiencia y es legible para los filtros automatizados?",
                        "question_verdict": "El CV supera de forma destacada los filtros ATS iniciales."
                    },
                    {
                        "role_id": "career_consultant",
                        "role_name": "Consultor Estratégico de Carrera",
                        "score": 88,
                        "weight_percentage": 10,
                        "justification": "La vacante ofrece una plataforma idónea para consolidar seniority y expandir responsabilidades de impacto.",
                        "strengths": ["Alineación con el plan de desarrollo profesional", "Reto acorde al seniority proyectado"],
                        "gaps": ["Definir metas de liderazgo a medio plazo"],
                        "key_question": "¿Esta oportunidad representa un buen movimiento profesional para el candidato?",
                        "question_verdict": "Excelente oportunidad estratégica de avance y consolidación profesional."
                    }
                ],
                "requirements_matrix": [
                    {
                        "requirement": "Experiencia previa demostrable en responsabilidades afines",
                        "cv_evidence": "Respaldada en trayectoria y roles previos detallados en el perfil",
                        "status": "cumplido",
                        "competency_status": "demostrada",
                        "importance": "excluyente"
                    },
                    {
                        "requirement": "Dominio de herramientas técnicas centrales y metodologías",
                        "cv_evidence": "Listado en habilidades técnicas y evidenciado en descripción de proyectos",
                        "status": "cumplido",
                        "competency_status": "demostrada",
                        "importance": "deseable"
                    },
                    {
                        "requirement": "Capacidad de trabajo autónomo y gestión de proyectos",
                        "cv_evidence": "Reflejado en logros de autonomía y coordinación",
                        "status": "parcial",
                        "competency_status": "transferible",
                        "importance": "general"
                    }
                ],
                "potential_projection": {
                    "potential_score": 93,
                    "score_delta": 6,
                    "target_competencies": ["Profundización en certificaciones de industria", "Adaptación de CV para destacar métricas de impacto"],
                    "required_evidence": ["Curso oficial o acreditación en Coach IA", "Inclusión de métricas cuantificables en CV"],
                    "estimated_effort": "1 a 2 semanas",
                    "reasoning": "Subsanando la mención explícita de herramientas y enriqueciendo el CV con logros medibles, la compatibilidad potencial supera el 90%."
                },
                "director_synthesis": {
                    "summary": "El Comité dictamina un ajuste sólido de 87/100 (Recomendable postular). Coincidencia alta en evaluación técnica y de RRHH.",
                    "contradictions_detected": [],
                    "critical_deal_breakers": [],
                    "missing_evidence_vs_real_gaps": "Las brechas detectadas corresponden principalmente a falta de mención explícita en el documento más que a carencia formativa.",
                    "final_recommendation": "Recomendable postular",
                    "suggested_actions": [
                        "Adaptar el CV en Laboratorio CV para incluir las palabras clave sugeridas",
                        "Enviar las competencias periféricas al Coach IA para consolidar conceptos",
                        "Preparar historias STAR para la ronda con el Hiring Manager"
                    ]
                },
                "strengths": [
                    "Sólida coincidencia en experiencia y competencias requeridas",
                    "Capacidad demostrada de autonomía y resolución técnica",
                    "Currículum claro y estructurado para filtros ATS"
                ],
                "missing_skills": [
                    "Explicitación de métricas de impacto cuantificables en proyectos recientes",
                    "Familiaridad con herramientas periféricas mencionadas en la oferta"
                ],
                "deal_breakers_found": []
            })

        # 3. Drafter: CV and Cover Letter
        elif "tailored_cv_markdown" in prompt_lower or "vacante objetivo" in prompt_lower:
            return json.dumps({
                "tailored_cv_markdown": "# Candidato Profesional\n**Profesional Especialista** | Chile / Remoto Global | candidato@example.com\n\n## Perfil Profesional\nProfesional con sólida trayectoria demostrable en diseño, gestión e implementación de soluciones estratégicas.\n\n## Competencias Clave\nGestión de Proyectos, Resolución de Problemas, Comunicación Asertiva, Análisis Estratégico.\n\n## Experiencia Relevante\n### Especialista — Empresa Líder (2022 - Presente)\n- Diseñó e implementó iniciativas estratégicas reduciendo tiempos de operación en 35%.\n- Lideró equipo multidisciplinario cumpliendo hitos de calidad.\n\n### Profesional de Área — Servicios Especializados (2019 - 2022)\n- Optimizó procedimientos clave elevando la eficiencia operativa.\n\n## Educación\n- **Título Profesional**, Universidad de Chile (2018)",
                "cover_letter": "Estimado equipo de contratación,\n\nLes presento mi postulación para la vacante disponible. Con mi experiencia liderando soluciones de alto impacto y orientadas a resultados de excelencia, considero que mi perfil encaja directamente con los desafíos del puesto.\n\nEn mi trayectoria reciente he gestionado proyectos críticos optimizando flujos de trabajo y asegurando los más altos estándares de calidad y ética profesional.\n\nQuedo a su disposición para coordinar una entrevista.\n\nAtentamente,\nCandidato Profesional"
            })

        # 4. Reviewer: ATS score and critique
        elif "audita esta postulación" in prompt_lower or "ats_score" in prompt_lower:
            return json.dumps({
                "ats_score": 95,
                "ats_feedback": [
                    "Excelente jerarquía de encabezados legible para motores ATS",
                    "Palabras clave de Python, IA y Cloud claramente integradas",
                    "Logros orientados al impacto con métricas verificables"
                ],
                "reviewer_critique": "El CV y la carta están perfectamente alineados con los requisitos de la vacante, con un tono profesional, sin clichés y con evidencia comprobable."
            })

        # 5. Preference Learning Insights
        elif "historial de acciones del usuario" in prompt_lower or "insights" in prompt_lower:
            return json.dumps({
                "insights": [
                    "Prioriza posiciones 100% remotas con compensación competitiva",
                    "Preferencia por arquitecturas con Python, FastAPI e Inteligencia Artificial",
                    "Afinidad por empresas con cultura asíncrona y autonomía técnica"
                ]
            })

        # 6. Interview Prep Kit
        elif "kit de preparación" in prompt_lower or "technical_questions" in prompt_lower:
            return json.dumps({
                "company_focus": "Enfoque en arquitectura escalable, autonomía en desarrollo remoto y diseño de soluciones con IA.",
                "technical_questions": [
                    {
                        "question": "¿Cómo diseñarías una arquitectura resiliente para orquestar agentes de IA concurrentes?",
                        "key_concepts": "Colas de mensajes, rate limiting, observabilidad y manejo de fallos",
                        "tip": "Menciona cómo gestionas la latencia y los reintentos automáticos."
                    },
                    {
                        "question": "¿Cuál es tu estrategia para mantener alta cobertura y calidad en código distribuido?",
                        "key_concepts": "CI/CD, pruebas de integración y contratos de API",
                        "tip": "Cita tu experiencia reduciendo incidentes en producción."
                    }
                ],
                "behavioral_questions": [
                    {
                        "question": "Cuéntame de una ocasión en que lideraste una decisión técnica polémica en tu equipo.",
                        "suggested_star_story": "Proyecto de migración a microservicios en CloudSolutions",
                        "focus": "Enfoque en consenso basado en datos y métricas."
                    }
                ],
                "questions_to_ask_interviewer": [
                    "¿Cuáles son los hitos tecnológicos principales para este rol en los primeros 6 meses?",
                    "¿Cómo está estructurado el proceso de toma de decisiones arquitectónicas en el equipo remoto?"
                ]
            })

        # 7. Conversational Chat Assistant (Opi Offline Heuristic)
        elif "asistente de perfil profesional" in prompt_lower or "mensaje del candidato" in prompt_lower:
            if any(k in prompt_lower for k in ["oferta", "ofertas", "empleo", "empleos", "vacante", "vacantes", "trabajo", "radar", "remot"]):
                reply = "He consultado las vacantes de tu Radar local. Puedes filtrar y explorar las mejores opciones en la pestaña 'Radar de Empleo', o indicarme qué cargo buscas para evaluar coincidencias."
            elif any(k in prompt_lower for k in ["cv", "curriculum", "perfil", "mejorar", "experiencia", "logro"]):
                reply = "Para maximizar tu Fit Score, te aconsejo redactar tus experiencias bajo el método STAR (Situación, Tarea, Acción y Resultado). ¿Cuál fue el logro o métrica cuantificable más relevante de tu último trabajo?"
            else:
                reply = "He registrado tus comentarios en tu memoria cognitiva local. ¿Qué aspectos de tu búsqueda laboral (por ejemplo: modalidad 100% remota, banda salarial o tecnologías) te gustaría priorizar hoy?"

            return json.dumps({
                "assistant_reply": reply,
                "star_story": None,
                "new_insights": [],
                "deal_breakers": []
            })

        # Default fallback
        return json.dumps({
            "message": "Operación simulada del sistema de búsqueda de empleo (Modo sin API Key configurada)."
        })

llm = UnifiedLLMProvider()
