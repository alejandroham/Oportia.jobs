"""
Role Recommender & ATS Query Generator
Basado estrictamente en la sección 5 del documento 'radar_inteligente_oportunidades_laborales.md':
- Analiza el perfil estructurado del candidato.
- Infiere familias de cargos con justificación transparente (coincidencia directa, transferencia de habilidades, exploratorias).
- Genera consultas dinámicas (Dorks) para Workday, Greenhouse, Lever, Ashby y portales corporativos.
- No alucina ni fija de antemano una lista estática.
"""

from typing import List, Dict, Any
from app.models.schemas import CandidateProfile, UserPreferences, RoleRecommendation, GeneratedATSQuery
from app.agents.llm_provider import llm
import logging
import json

logger = logging.getLogger(__name__)

class RoleRecommenderAgent:
    def recommend_roles(self, profile: CandidateProfile, prefs: UserPreferences) -> List[RoleRecommendation]:
        """
        Recomienda familias de cargos analizando la evidencia del CV del candidato.
        """
        prompt = f"""
Actúa como un orientador y analista de oportunidades laborales de alto nivel basado en evidencia estricta.
Analiza el siguiente perfil profesional y recomienda entre 3 y 6 familias de cargos coherentes con su trayectoria.

PERFIL DEL CANDIDATO:
- Titular: {profile.headline or 'Profesional TI'}
- Años de Experiencia: {profile.years_of_experience} años
- Habilidades Técnicas: {", ".join(profile.technical_skills[:20])}
- Resumen: {profile.summary or ''}
- Experiencias:
{chr(10).join([f"  * {exp.role} en {exp.company} ({exp.start_date} - {exp.end_date or 'Actual'}): {exp.description[:180]}" for exp in profile.experiences[:4]])}

PREFERENCIAS DEL USUARIO:
- Roles objetivo declarados: {", ".join(prefs.target_roles) if prefs.target_roles else "No especificados"}
- Tecnologías preferidas: {", ".join(prefs.preferred_technologies) if prefs.preferred_technologies else "No especificadas"}
- Modalidad: {"Solo Remoto" if prefs.remote_only else "Cualquiera"}

REGLAS FUNDAMENTALES (Sección 5.4 y 5.7 del Radar Inteligente):
1. Distingue claramente:
   - "direct": coincidencia directa (el currículum demuestra experiencia similar y sólida).
   - "transferable": transferencia de habilidades (competencias reales aplicables a otro rol afín).
   - "exploratory": oportunidad exploratoria (relación posible pero con requisitos a validar).
2. Explica la razón exacta y cita evidencia tangible del CV.
3. No inventes tecnologías, certificaciones ni años que no existan.
4. Entrega títulos alternativos tanto en español como en inglés.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura (sin texto antes ni después):
[
  {{
    "role_family": "Nombre de la Familia (ej: Liderazgo TI, Cloud e Infraestructura, etc.)",
    "suggested_titles": ["Título 1 en Español", "Title 2 in English"],
    "recommendation_type": "direct" | "transferable" | "exploratory",
    "reasoning": "Explicación detallada citando evidencia real del CV",
    "matching_skills": ["Skill 1", "Skill 2"],
    "identified_gaps": ["Requisito o brecha a considerar si aplica"],
    "seniority": "Senior / Lead / Manager / etc."
  }}
]
"""
        try:
            res_text = llm.generate_response(prompt, temperature=0.2)
            cleaned = res_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            data = json.loads(cleaned.strip())
            return [RoleRecommendation(**item) for item in data]
        except Exception as e:
            logger.warning(f"Fallback heurístico para recomendaciones de roles: {e}")
            return self._heuristic_roles(profile, prefs)

    def _heuristic_roles(self, profile: CandidateProfile, prefs: UserPreferences) -> List[RoleRecommendation]:
        recs = []
        primary = profile.primary_profession or (prefs.target_roles[0] if prefs.target_roles else (profile.headline or "Profesional"))
        sector = profile.economic_sectors[0] if profile.economic_sectors else "Área Profesional"
        eq_titles = profile.equivalent_roles or [primary]
        related_titles = profile.related_roles or [f"Coordinador/a de {primary}", f"Especialista en {primary}"]

        # 1. Direct role from CV profession
        recs.append(RoleRecommendation(
            role_family=f"{primary} & Especialidad",
            suggested_titles=eq_titles[:3] if eq_titles else [primary, f"{primary} Senior"],
            recommendation_type="direct",
            reasoning=f"Alineado directamente con la profesión identificada ({primary}), trayectoria declarada ({profile.years_of_experience} años) y competencias centrales.",
            matching_skills=profile.technical_skills[:5],
            seniority="Senior / Especialista" if profile.years_of_experience >= 5 else "Profesional / Técnico"
        ))

        # 2. Transferable skills role
        transferable_titles = related_titles[:3] if related_titles else [f"Supervisor/a de {primary}", f"Encargado/a de Operaciones"]
        recs.append(RoleRecommendation(
            role_family=f"Coordinación y Supervisión en {sector}",
            suggested_titles=transferable_titles,
            recommendation_type="transferable",
            reasoning=f"Aprovecha sus competencias transferibles en {sector}, capacidad resolutiva y dominio de procesos técnicos demostrados en el currículum.",
            matching_skills=(profile.soft_skills + profile.technical_skills)[:4],
            identified_gaps=["Validar requisitos o acreditaciones específicas solicitadas por cada institución"],
            seniority="Coordinación / Jefatura" if profile.years_of_experience >= 4 else "Especialista"
        ))

        # 3. Exploratory role
        recs.append(RoleRecommendation(
            role_family=f"Consultoría y Planificación en {sector}",
            suggested_titles=[f"Consultor/a en {primary}", f"Gestor/a de Proyectos en {sector}", f"Auditor/a Técnico/a"],
            recommendation_type="exploratory",
            reasoning=f"Oportunidad de ampliación profesional en {sector} aplicando visión técnica y experiencia práctica acumulada.",
            matching_skills=profile.technical_skills[:4],
            identified_gaps=["Desarrollo de competencias de formulación y gestión integral de proyectos"],
            seniority="Senior / Consultor"
        ))

        return recs

    def generate_ats_queries(self, profile: CandidateProfile, prefs: UserPreferences, recs: List[RoleRecommendation]) -> List[GeneratedATSQuery]:
        """
        Construye consultas dinámicas ATS listas para ejecutar (Sección 5.6 y 7 del documento).
        """
        queries: List[GeneratedATSQuery] = []

        # Recopilar títulos aprobados o de alta recomendación
        active_recs = [r for r in recs if r.approved_by_user is not False]
        if not active_recs:
            active_recs = recs

        platforms = [
            ("Workday", "site:myworkdayjobs.com"),
            ("Greenhouse", "site:boards.greenhouse.io"),
            ("Lever", "site:jobs.lever.co"),
            ("Ashby", "site:jobs.ashbyhq.com"),
            ("SmartRecruiters", "site:jobs.smartrecruiters.com"),
        ]

        locations_cl = '("Chile" OR "Santiago" OR "Remoto")'
        locations_global = '("Remote" OR "LATAM" OR "Latin America")'

        for rec in active_recs[:3]:
            titles_clean = [f'"{t}"' for t in rec.suggested_titles[:2]]
            title_clause = f"({' OR '.join(titles_clean)})"

            # 1. Consulta para Workday (Grandes corporaciones)
            queries.append(GeneratedATSQuery(
                target_platform="Workday",
                role_family=rec.role_family,
                category="nacional",
                query_text=f'site:myworkdayjobs.com {title_clause} {locations_cl}'
            ))

            # 2. Consulta para Greenhouse / Lever (Startups y Tech)
            queries.append(GeneratedATSQuery(
                target_platform="Greenhouse",
                role_family=rec.role_family,
                category="internacional",
                query_text=f'site:boards.greenhouse.io {title_clause} {locations_global}'
            ))

            # 3. Consulta para Ashby / Lever
            queries.append(GeneratedATSQuery(
                target_platform="Ashby",
                role_family=rec.role_family,
                category="internacional",
                query_text=f'site:jobs.ashbyhq.com {title_clause} {locations_global}'
            ))

        return queries

role_recommender = RoleRecommenderAgent()
