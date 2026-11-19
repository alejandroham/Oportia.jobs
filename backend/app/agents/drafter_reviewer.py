from typing import List, Optional, Tuple
from app.models.schemas import CandidateProfile, JobPosting, ApplicationDraft, UserPreferences, CvOptions
from app.agents import cv_selection
from app.agents.cv_fidelity import verify_cv, verify_letter
from app.privacy.redact import NAME_TOKEN, apply_cv_header, profile_json_for_ai, redact_text, restore_tokens
from app.agents.llm_provider import llm, LLMProviderError, AINotConnectedError, USER_FACING_LLM_ERRORS
from app.storage.db import db
import logging
import json

logger = logging.getLogger(__name__)

# Oportia sirve a personas de cualquier área (salud, educación, construcción, comercio,
# administración, oficios, tecnología...). Los textos para la IA no deben asumir un perfil TI.
DRAFTER_SYSTEM_INSTRUCTION = (
    "Eres un redactor experto de currículums y cartas de presentación para personas de cualquier "
    "profesión, oficio o industria (salud, educación, construcción, comercio, administración, "
    "servicios, tecnología, sector público, etc.). Escribes en español neutro y profesional, "
    "adaptando el vocabulario al área de la vacante. "
    "REGLA DE ORO DE INTEGRIDAD: NUNCA inventes experiencia, títulos, empresas, certificaciones ni "
    "herramientas que no existan en el perfil del candidato. "
    "Tu tarea es REORDENAR, ENFATIZAR y CONTEXTUALIZAR los logros reales del candidato para resaltar "
    "su relevancia para la vacante objetivo."
)


class DrafterReviewerPipeline:
    def generate_application(
        self,
        job: JobPosting,
        profile: CandidateProfile,
        preferences: Optional[UserPreferences] = None,
        persist: bool = True,
        cv_options: Optional[CvOptions] = None,
    ) -> ApplicationDraft:
        """
        Genera CV adaptado + carta de presentación y los audita.

        persist=False se usa en el endpoint sin estado (/api/applications/draft): no lee ni escribe
        en el disco del servidor; las preferencias llegan en la petición.
        """
        prefs = preferences if preferences is not None else (db.get_preferences() if persist else None)

        # Paso 0: qué experiencias se desarrollan y qué tan largo es el CV.
        options = cv_options or CvOptions()
        length = cv_selection.normalize_length(options.length)
        selected_ids, reasons, method = cv_selection.choose_experiences(profile, job, length, options.experience_ids)
        focused, others = cv_selection.split_profile(profile, selected_ids, length)

        # Paso 1: el redactor genera CV y carta con las experiencias elegidas.
        # La IA no recibe nombre, correo, teléfono, comuna ni enlaces: trabaja con marcadores.
        cv_markdown, cover_letter = self._draft_materials(job, focused, prefs, length)

        # Paso 1b: fidelidad. Lo que no esté en el perfil real se detecta; la IA corrige una vez y lo que quede se quita.
        cv_markdown, removed = verify_cv(cv_markdown, profile)
        if removed:
            retry = self._redraft_cv(job, focused, prefs, length, removed)
            if retry:
                retry_clean, retry_removed = verify_cv(retry, profile)
                if len(retry_removed) < len(removed):
                    cv_markdown, removed = retry_clean, retry_removed
        cover_letter, letter_removed = verify_letter(cover_letter, profile)
        fidelity_warnings = removed + letter_removed
        cv_markdown = cv_selection.insert_previous_experience(cv_markdown, others)

        # Paso 2: el revisor audita (no bloqueante) sobre los documentos aún sin datos de contacto.
        ats_score, ats_feedback, reviewer_critique = self._review_materials(job, profile, cv_markdown, cover_letter)

        # Paso 3: Oportia pone los datos reales con reglas: encabezado exacto del perfil y firma de la carta.
        cv_markdown = apply_cv_header(cv_markdown, profile)
        cover_letter = restore_tokens(cover_letter, profile)
        ats_feedback = [restore_tokens(x, profile) for x in ats_feedback]
        reviewer_critique = restore_tokens(reviewer_critique or "", profile) or reviewer_critique

        cv_html = self._markdown_to_apple_html(cv_markdown, profile.name)

        draft = ApplicationDraft(
            job_id=job.id,
            job_title=job.title,
            company=job.company,
            tailored_cv_markdown=cv_markdown,
            tailored_cv_html=cv_html,
            cover_letter=cover_letter,
            ats_score=ats_score,
            ats_feedback=ats_feedback,
            reviewer_critique=reviewer_critique,
            cv_length=length,
            selected_experience_ids=selected_ids,
            selection_reasons=reasons,
            selection_method=method,
            fidelity_warnings=fidelity_warnings,
        )

        if persist:
            db.save_application(draft)
            db.update_job_status(job.id, status="applied" if job.status == "applied" else "saved")
        return draft

    @staticmethod
    def _memory_context(prefs: Optional[UserPreferences]) -> str:
        if not prefs:
            return ""
        memory_context = ""
        if prefs.learned_star_stories:
            top_stories = [
                f"- {s.title}: {s.situation_and_task} -> {s.action} -> Resultado: {s.result_and_metrics}"
                for s in prefs.learned_star_stories[:4]
            ]
            memory_context += "\nLOGROS REALES VERIFICADOS DEL CANDIDATO (formato STAR, úsalos en la carta y en las viñetas del CV):\n" + "\n".join(top_stories) + "\n"
        if prefs.profile_dna:
            memory_context += f"\nTONO PROFESIONAL APRENDIDO:\n- Tono: {prefs.profile_dna.communication_tone}\n- Propuesta de valor: {prefs.profile_dna.summary}\n- Seniority inferido: {prefs.profile_dna.seniority_level}\n"
        return memory_context

    @staticmethod
    def _job_block(job: JobPosting) -> str:
        return (
            f"Título: {job.title}\n"
            f"Empresa: {job.company}\n"
            f"Ubicación / Modalidad: {job.location} ({'Remoto' if job.is_remote else 'Presencial'})\n"
            f"Descripción:\n{(job.description or '')[:4000]}"
        )

    @staticmethod
    def _strip_fences(text: str) -> str:
        cleaned = (text or "").strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else ""
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return cleaned.strip()

    def _draft_materials(self, job: JobPosting, profile: CandidateProfile, prefs: Optional[UserPreferences],
                         length: str = "2") -> Tuple[str, str]:
        memory_context, _ = redact_text(self._memory_context(prefs))
        profile_json = profile_json_for_ai(profile)
        length_rule = cv_selection.LENGTH_PROMPTS.get(length, "")

        prompt = f"""
VACANTE OBJETIVO:
{self._job_block(job)}

PERFIL REAL Y VERIFICADO DEL CANDIDATO:
{profile_json}
{memory_context}
INSTRUCCIONES DE REDACCIÓN:
1. Adapta el Currículum en formato Markdown limpio, estructurado con:
   - Encabezado: SOLO la línea "# {{{{NOMBRE}}}}". NO escribas correo, teléfono, dirección, comuna, RUT ni enlaces: Oportia agrega los datos de contacto exactos aparte.
   - Perfil profesional enfocado al cargo
   - Competencias y habilidades relevantes para la vacante primero
   - Experiencia laboral con viñetas de logros orientadas al impacto (resultados, métricas, responsabilidades clave, herramientas o técnicas usadas). REGLAS ESTRICTAS DE FORMATO: Usa SIEMPRE guiones '- ' para las viñetas, NUNCA asteriscos '* '. NO insertes separadores '---' entre secciones.
   - Educación, cursos y certificaciones
   - PROHIBIDO INVENTAR O FALSEAR: no agregues cifras, porcentajes, montos, cantidades, fechas, empresas, cargos, títulos, cursos, herramientas ni logros que no estén escritos en el perfil. Si un logro no trae cifra en el perfil, descríbelo sin cifra. Puedes reformular y destacar, nunca agregar hechos.
   - Incluye SOLO las experiencias del perfil entregado. NO agregues una sección "Experiencia anterior": Oportia la agrega aparte.
   - ORDEN: presenta la experiencia y la educación EXACTAMENTE en el orden en que vienen en el perfil (ya están ordenadas por fecha o como la persona eligió). No las reordenes por relevancia: la relevancia se muestra con el contenido, no con el orden.
   - {length_rule}
2. Redacta una Carta de Presentación moderna (3 a 4 párrafos concisos):
   - Prohibido usar clichés vacíos como "Me dirijo a ustedes para expresar mi entusiasmo...".
   - Apertura directa: por qué tu experiencia concreta responde a lo que busca la vacante.
   - Párrafos 2 y 3: dos ejemplos reales de tu trayectoria que lo demuestran, sin cifras ni hechos que no estén en el perfil.
   - Cierre propositivo y profesional, firmado exactamente como {{{{NOMBRE}}}} (sin agregar correo ni teléfono).

RESPONDE ÚNICAMENTE CON UN JSON:
{{
  "tailored_cv_markdown": "# {{{{NOMBRE}}}}\\n## Perfil profesional\\n...",
  "cover_letter": "Estimado equipo de selección de..."
}}
"""

        cv_md: Optional[str] = None
        cl: Optional[str] = None
        try:
            res = llm.generate_json(prompt, system_instruction=DRAFTER_SYSTEM_INSTRUCTION) or {}
            cv_md = res.get("tailored_cv_markdown") or res.get("cv") or res.get("curriculum")
            cl = res.get("cover_letter") or res.get("carta_presentacion") or res.get("carta")
            if isinstance(cl, (dict, list)):
                cl = None
        except USER_FACING_LLM_ERRORS:
            raise
        except LLMProviderError as e:
            # Respuestas largas con dos documentos a veces rompen el JSON: se generan por separado.
            logger.warning(f"Drafter JSON combinado falló ({e.code}); generando documentos por separado.")

        if not cv_md:
            cv_md = self._draft_cv_text(job, profile_json, memory_context, length_rule) or self._fallback_cv(profile, job)
        if not cl:
            cl = self._draft_cover_letter_text(job, profile, profile_json, memory_context) or self._fallback_cover_letter(profile, job)

        return cv_md.strip(), cl.strip()

    def _redraft_cv(self, job: JobPosting, profile: CandidateProfile, prefs: Optional[UserPreferences],
                    length: str, removed: List[str]) -> Optional[str]:
        """Segundo intento: se le muestra a la IA lo que agregó sin estar en el perfil para que lo quite."""
        memory_context, _ = redact_text(self._memory_context(prefs))
        correction = (
            "CORRECCIÓN OBLIGATORIA: en tu versión anterior agregaste datos que NO están en el perfil:\n"
            + "\n".join(f"- {r}" for r in removed[:12])
            + "\nReescribe el CV SIN esos datos. Usa solo cifras, fechas, empresas, cargos, estudios y competencias "
              "que aparezcan escritos en el perfil."
        )
        rule = cv_selection.LENGTH_PROMPTS.get(length, "") + "\n" + correction
        try:
            return self._draft_cv_text(job, profile_json_for_ai(profile), memory_context, rule)
        except USER_FACING_LLM_ERRORS:
            return None

    def _draft_cv_text(self, job: JobPosting, profile_json: str, memory_context: str, length_rule: str = "") -> Optional[str]:
        prompt = f"""
VACANTE OBJETIVO:
{self._job_block(job)}

PERFIL REAL Y VERIFICADO DEL CANDIDATO:
{profile_json}
{memory_context}
Escribe el CURRÍCULUM ADAPTADO a esta vacante en Markdown limpio ("# {{{{NOMBRE}}}}", ## secciones, viñetas con '- ').
NO escribas correo, teléfono, dirección, comuna, RUT ni enlaces: Oportia agrega los datos de contacto aparte.
Incluye SOLO las experiencias del perfil entregado; no agregues una sección "Experiencia anterior".
PROHIBIDO INVENTAR: no agregues cifras, porcentajes, fechas, empresas, cargos, estudios, cursos, herramientas ni logros que no estén escritos en el perfil.
Presenta la experiencia y la educación en el MISMO orden en que vienen en el perfil (no las reordenes).
{length_rule}
Responde SOLO con el Markdown del CV, sin explicaciones ni bloques de código.
"""
        try:
            return self._strip_fences(llm.generate_text(prompt, system_instruction=DRAFTER_SYSTEM_INSTRUCTION)) or None
        except USER_FACING_LLM_ERRORS:
            raise
        except LLMProviderError as e:
            logger.warning(f"No se pudo generar el CV adaptado por separado: {e.code}")
            return None

    def _draft_cover_letter_text(self, job: JobPosting, profile: CandidateProfile, profile_json: str, memory_context: str) -> Optional[str]:
        prompt = f"""
VACANTE OBJETIVO:
{self._job_block(job)}

PERFIL REAL Y VERIFICADO DEL CANDIDATO:
{profile_json}
{memory_context}
Escribe una CARTA DE PRESENTACIÓN en español para esta vacante (3 a 4 párrafos, sin clichés,
con dos ejemplos reales de la trayectoria del candidato) y fírmala exactamente como {NAME_TOKEN} (sin correo ni teléfono).
Responde SOLO con el texto de la carta, sin títulos, explicaciones ni Markdown.
"""
        try:
            return self._strip_fences(llm.generate_text(prompt, system_instruction=DRAFTER_SYSTEM_INSTRUCTION)) or None
        except USER_FACING_LLM_ERRORS:
            raise
        except LLMProviderError as e:
            logger.warning(f"No se pudo generar la carta por separado: {e.code}")
            return None

    @staticmethod
    def _fallback_cover_letter(profile: CandidateProfile, job: JobPosting) -> str:
        """Plantilla neutra (sirve para cualquier área) cuando la IA no entrega la carta."""
        experiencia = profile.headline or profile.primary_profession or "mi trayectoria profesional"
        anos = f" y {profile.years_of_experience:g} años de experiencia" if getattr(profile, "years_of_experience", 0) else ""
        return (
            f"Estimado equipo de selección de {job.company}:\n\n"
            f"Presento mi postulación al cargo de {job.title}. Mi formación como {experiencia}{anos} "
            f"me permiten aportar desde el primer día a los objetivos del equipo.\n\n"
            "Me interesa especialmente esta oportunidad porque se alinea con lo que he desarrollado en mi "
            "carrera y con los resultados que he logrado en mis cargos anteriores, detallados en mi currículum.\n\n"
            "Quedo a su disposición para conversar sobre cómo puedo contribuir.\n\n"
            f"Atentamente,\n{profile.name}"
        )

    def _review_materials(self, job: JobPosting, profile: CandidateProfile, cv_md: str, cover_letter: str) -> Tuple[int, list, str]:
        system_instruction = (
            "Eres un Revisor Crítico de selección de personal y Auditor ATS para vacantes de cualquier área. "
            "Auditas con ojo clínico los documentos generados: "
            "1. ¿Hay afirmaciones dudosas o inventadas que no respaldaba el perfil original? "
            "2. ¿El lenguaje es directo, medible y profesional? "
            "3. ¿Los términos clave de la oferta están bien representados para pasar filtros ATS?"
        )

        prompt = f"""
AUDITA ESTA POSTULACIÓN:

OFERTA:
{job.title} en {job.company}

CV ADAPTADO:
{cv_md[:4000]}

CARTA DE PRESENTACIÓN:
{cover_letter}

RESPONDE EN JSON:
{{
  "ats_score": 92,
  "ats_feedback": [
    "Puntos fuertes de palabras clave detectados",
    "Recomendación para mejorar legibilidad ATS"
  ],
  "reviewer_critique": "Breve diagnóstico del revisor con tono constructivo y directo."
}}
"""
        try:
            res = llm.generate_json(prompt, system_instruction=system_instruction)
        except USER_FACING_LLM_ERRORS:
            raise
        except LLMProviderError as e:
            logger.warning(f"Auditoría ATS no disponible ({e.code}); se entregan los documentos sin puntaje.")
            res = None
        if not res or "ats_score" not in res:
            return 0, ["No se pudo completar la auditoría ATS automática. Revisa los documentos antes de enviarlos."], "Revisión automática no disponible en este intento."
        score = res.get("ats_score", 85)
        feedback = res.get("ats_feedback", ["Formato legible para filtros ATS"])
        critique = res.get("reviewer_critique", "Revisión completada.")
        return score, feedback, critique

    def _fallback_cv(self, profile: CandidateProfile, job: JobPosting) -> str:
        md = f"# {profile.name}\n"
        md += f"**{profile.headline}** | {profile.location} | {profile.email or ''}\n\n"
        md += f"## Perfil Profesional\n{profile.summary}\n\n"
        md += f"## Competencias\n{', '.join(profile.technical_skills)}\n\n"
        md += "## Experiencia Laboral\n"
        for exp in profile.experiences:
            md += f"### {exp.role} — {exp.company}\n"
            md += f"*{exp.start_date} – {exp.end_date} | {exp.location or 'Remoto'}*\n"
            md += f"{exp.description}\n"
            for b in exp.bullet_achievements:
                md += f"- {b}\n"
            if exp.technologies:
                md += f"**Herramientas:** {', '.join(exp.technologies)}\n"
            md += "\n"
        md += "## Educación\n"
        for edu in profile.education:
            md += f"- **{edu.degree} en {edu.field_of_study}**, {edu.institution} ({edu.graduation_year or ''})\n"
        return md

    def _markdown_to_apple_html(self, markdown_text: str, candidate_name: str) -> str:
        # Simple, elegant HTML styling with Apple typography
        import re
        html_body = markdown_text
        html_body = re.sub(r'^# (.*)$', r'<h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2 mb-4">\1</h1>', html_body, flags=re.M)
        html_body = re.sub(r'^## (.*)$', r'<h2 class="text-lg font-medium text-blue-600 dark:text-blue-400 mt-6 mb-3 uppercase tracking-wider text-xs">\1</h2>', html_body, flags=re.M)
        html_body = re.sub(r'^### (.*)$', r'<h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mt-4 mb-1">\1</h3>', html_body, flags=re.M)
        html_body = re.sub(r'^\* (.*)$', r'<li class="text-sm text-gray-700 dark:text-gray-300 ml-4 list-disc">\1</li>', html_body, flags=re.M)
        html_body = re.sub(r'^- (.*)$', r'<li class="text-sm text-gray-700 dark:text-gray-300 ml-4 list-disc">\1</li>', html_body, flags=re.M)
        html_body = re.sub(r'\*\*(.*?)\*\*', r'<strong class="font-semibold text-gray-900 dark:text-white">\1</strong>', html_body)
        html_body = re.sub(r'\*(.*?)\*', r'<em class="italic text-gray-500 dark:text-gray-400 text-xs">\1</em>', html_body)
        
        return f"""
        <div class="apple-cv-document p-8 max-w-4xl mx-auto bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-gray-100 font-sans leading-relaxed">
            {html_body}
        </div>
        """

drafter_reviewer = DrafterReviewerPipeline()
