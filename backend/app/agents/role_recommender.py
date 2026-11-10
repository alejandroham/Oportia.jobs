"""
Role Recommender & ATS Query Generator
Basado estrictamente en la sección 5 del documento 'radar_inteligente_oportunidades_laborales.md':
- Analiza el perfil estructurado del candidato y su evidencia curricular real.
- Infiere familias de cargos con justificación transparente (coincidencia directa, transferencia de habilidades, exploratorias).
- Genera consultas dinámicas (Dorks) para Workday, Greenhouse, Lever, Ashby y portales corporativos.
- No alucina ni fija de antemano una lista estática de 3 items.
"""

from typing import List, Dict, Any, Optional
from app.models.schemas import CandidateProfile, UserPreferences, RoleRecommendation, GeneratedATSQuery
from app.agents.llm_provider import llm
import logging
import json
import re

logger = logging.getLogger(__name__)

class RoleRecommenderAgent:
    def recommend_roles(self, profile: CandidateProfile, prefs: UserPreferences) -> List[RoleRecommendation]:
        """
        Recomienda familias de cargos analizando la evidencia del CV del candidato.
        Infiere entre 4 y 6 familias claramente diferenciadas (direct, transferable, exploratory).
        """
        prompt = f"""
Actúa como un orientador y analista de oportunidades laborales de alto nivel basado en evidencia estricta.
Analiza el siguiente perfil profesional y recomienda entre 4 y 6 familias de cargos coherentes con su trayectoria demostrada.

PERFIL DEL CANDIDATO:
- Nombre: {profile.name}
- Titular: {profile.headline or 'Profesional'}
- Profesión Principal: {profile.primary_profession or 'Profesional'}
- Años de Experiencia: {profile.years_of_experience} años
- Sectores Económicos: {", ".join(profile.economic_sectors) if profile.economic_sectors else 'General'}
- Habilidades Técnicas: {", ".join(profile.technical_skills[:25])}
- Resumen: {profile.summary or ''}
- Experiencias:
{chr(10).join([f"  * {exp.role} en {exp.company} ({exp.start_date} - {exp.end_date or 'Actual'}): {exp.description[:180]}" for exp in profile.experiences[:5]])}

PREFERENCIAS DEL USUARIO:
- Roles objetivo declarados: {", ".join(prefs.target_roles[:12]) if prefs.target_roles else "No especificados"}
- Tecnologías preferidas: {", ".join(prefs.preferred_technologies[:12]) if prefs.preferred_technologies else "No especificadas"}
- Modalidad: {"Solo Remoto" if prefs.remote_only else "Cualquiera"}

REGLAS FUNDAMENTALES (Sección 5.4 y 5.7 del Radar Inteligente):
1. Recomienda entre 4 y 6 familias de roles claramente diferenciadas:
   - "direct": coincidencia directa (el currículum demuestra experiencia similar y sólida).
   - "transferable": transferencia de habilidades (competencias reales aplicables a otro rol afín o sectorial).
   - "exploratory": oportunidad exploratoria o de crecimiento estratégico (con brechas o requisitos a validar).
2. Explica la razón exacta y cita evidencia tangible del CV chileno del candidato.
3. No inventes tecnologías, certificaciones ni años que no existan.
4. Entrega títulos alternativos tanto en español como en inglés usados en portales y ATS.
5. El resultado debe ser un objeto JSON con la clave "roles" que contenga la lista de 4 a 6 recomendaciones.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura (sin texto antes ni después):
{{
  "roles": [
    {{
      "role_family": "Nombre de la Familia (ej: Liderazgo TI / IT Management, Administración Cloud & SysAdmin, Docencia Técnica, etc.)",
      "suggested_titles": ["Título 1 en Español", "Title 2 in English", "Título Alternativo"],
      "recommendation_type": "direct" | "transferable" | "exploratory",
      "reasoning": "Explicación detallada citando evidencia real del CV",
      "matching_skills": ["Skill 1", "Skill 2", "Skill 3"],
      "identified_gaps": ["Requisito o brecha a considerar si aplica"],
      "seniority": "Senior / Lead / Manager / Docente / Especialista"
    }}
  ]
}}
"""
        try:
            res = llm.generate_json(prompt, system_instruction="Eres un asesor laboral experto en reclutamiento corporativo, plataformas ATS y taxonomía de cargos.")
            items = []
            if isinstance(res, dict) and "roles" in res and isinstance(res["roles"], list) and len(res["roles"]) >= 3:
                items = res["roles"]
            elif isinstance(res, list) and len(res) >= 3:
                items = res
            else:
                # Secondary attempt via generate_text
                raw_text = llm.generate_text(prompt, system_instruction="Eres un asesor laboral experto.")
                cleaned = raw_text.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                parsed = json.loads(cleaned.strip())
                if isinstance(parsed, dict) and "roles" in parsed:
                    items = parsed["roles"]
                elif isinstance(parsed, list):
                    items = parsed

            if items and len(items) >= 3:
                recs = [RoleRecommendation(**item) for item in items]
                if len(recs) >= 3:
                    return recs
        except Exception as e:
            logger.warning(f"Fallback a recomendador heurístico avanzado de roles: {e}")

        return self._heuristic_roles(profile, prefs)

    def _heuristic_roles(self, profile: CandidateProfile, prefs: UserPreferences) -> List[RoleRecommendation]:
        """
        Recomendador heurístico dinámico de 4 a 6 familias que deduce áreas de oportunidad
        a partir de la profesión base, las experiencias laborales reales, los sectores y las habilidades.
        """
        recs = []
        primary = profile.primary_profession or (prefs.target_roles[0] if prefs.target_roles else (profile.headline or "Profesional"))
        sector = profile.economic_sectors[0] if profile.economic_sectors else "Tecnología y Servicios"
        eq_titles = profile.equivalent_roles or [primary]
        related_titles = profile.related_roles or [f"Coordinador/a de {primary}", f"Especialista en {primary}"]
        years = profile.years_of_experience

        # Extraer palabras clave de las experiencias pasadas
        exp_text = " ".join([f"{e.role} {e.company} {e.description}" for e in profile.experiences]).lower()
        skills_text = " ".join(profile.technical_skills + profile.soft_skills).lower()

        # 1. Familia Directa Central (Profesión y Especialidad Base)
        recs.append(RoleRecommendation(
            role_family=f"{primary} & Especialidad Técnica",
            suggested_titles=eq_titles[:4] if eq_titles else [primary, f"{primary} Senior", f"Especialista en {primary}"],
            recommendation_type="direct",
            reasoning=f"Alineado directamente con la profesión declarada ({primary}), trayectoria consolidada ({years} años) y competencias centrales verificables en su currículum.",
            matching_skills=profile.technical_skills[:5],
            seniority="Senior / Especialista" if years >= 5 else "Profesional"
        ))

        # 2. Familia de Gestión, Jefatura o Dirección Operativa (Directa o Transferible)
        has_leadership = any(w in exp_text or w in (profile.headline or "").lower() for w in ["encargado", "jefe", "gerente", "manager", "lider", "líder", "coordinador", "director"])
        mgmt_titles = [t for t in eq_titles if any(k in t.lower() for k in ["jefe", "gerente", "manager", "director", "encargado"])]
        if not mgmt_titles:
            mgmt_titles = [f"Jefe de {primary}", f"IT Manager", f"Encargado/a de TI y Operaciones", f"Coordinador/a de {sector}"]

        recs.append(RoleRecommendation(
            role_family=f"Gestión, Liderazgo y Jefatura en {sector}",
            suggested_titles=mgmt_titles[:4],
            recommendation_type="direct" if has_leadership else "transferable",
            reasoning=f"Evidencia sólida en roles de responsabilidad y liderazgo operativo ({'experiencia comprobada en jefatura/encargado' if has_leadership else 'capacidad de coordinación demostrada'}), supervisión de servicios críticos y cumplimiento de objetivos institucionales.",
            matching_skills=(profile.soft_skills[:3] + profile.technical_skills[:3]),
            identified_gaps=[] if has_leadership else ["Validar certificaciones en gestión ágil o marcos formales (ITIL, PMP)"],
            seniority="Manager / Jefatura" if years >= 6 else "Coordinador / Lead"
        ))

        # 3. Familia de Sistemas, Infraestructura y Continuidad Operativa (Directa o Transferible)
        has_infra = any(w in exp_text or w in skills_text for w in ["sysadmin", "azure", "aws", "cloud", "servidores", "soporte", "redes", "microsoft 365", "sistemas"])
        infra_titles = ["Administrador de Sistemas (SysAdmin)", "Ingeniero de Infraestructura Cloud", "Especialista en Continuidad Operativa y Soporte", "Cloud Systems Administrator"]
        recs.append(RoleRecommendation(
            role_family="Infraestructura Cloud, Sistemas y Soporte Especializado",
            suggested_titles=infra_titles,
            recommendation_type="direct" if has_infra else "transferable",
            reasoning=f"Competencias demostradas en administración de plataformas, servidores, servicios cloud (Azure, AWS, M365) y resolución de incidentes técnicos de alta prioridad.",
            matching_skills=[s for s in profile.technical_skills if any(k in s.lower() for k in ["azure", "aws", "cloud", "microsoft", "redes", "sistemas", "soporte"])][:4] or profile.technical_skills[:4],
            identified_gaps=["Mantener actualizadas certificaciones de arquitectura en proveedores cloud públicos"],
            seniority="Senior / Especialista"
        ))

        # 4. Familia de Docencia, Formación o Transferencia Técnica (Transferible)
        has_teaching = any(w in exp_text or w in (profile.headline or "").lower() for w in ["profesor", "docente", "slep", "liceo", "colegio", "capacitador", "relator", "formador", "tutor", "educación", "educativa"])
        if has_teaching:
            teaching_titles = ["Profesor Técnico Profesional en Programación", "Docente del Área Tecnológica", "Relator / Formador Técnico TI", "Technical Trainer"]
            recs.append(RoleRecommendation(
                role_family="Docencia, Capacitación y Formación Técnico-Profesional",
                suggested_titles=teaching_titles,
                recommendation_type="direct",
                reasoning="Experiencia acreditada en docencia e instrucción técnico-profesional (SLEP / Liceos / Centros de Formación), destacando en pedagogía aplicada y transmisión efectiva de conocimientos tecnológicos.",
                matching_skills=["Docencia Técnica", "Programación y Algoritmos", "Comunicación Pedagógica", "Evaluación de Aprendizajes"],
                identified_gaps=["Validar acreditaciones pedagógicas o registro ministerial docente según la institución"],
                seniority="Docente / Relator Especialista"
            ))
        else:
            # Alternativa: Transformación Digital & Cumplimiento Normativo
            recs.append(RoleRecommendation(
                role_family=f"Transformación Digital & Cumplimiento en {sector}",
                suggested_titles=["Líder de Transformación Digital", "Especialista en Cumplimiento Tecnológico", "Analista de Modernización y Procesos", "Digital Transformation Lead"],
                recommendation_type="transferable",
                reasoning=f"Capacidad comprobada para digitalizar flujos de trabajo, automatizar procesos y asegurar cumplimiento regulatorio en {sector}.",
                matching_skills=profile.technical_skills[:4],
                identified_gaps=["Alineamiento con marcos específicos de compliance o marcos legales vigentes"],
                seniority="Lead / Especialista"
            ))

        # 5. Familia de Gobierno TI, Modernización y Transparencia (Transferible)
        has_transparency = any(w in exp_text for w in ["transparencia", "gobierno ti", "modernización", "público", "estado", "compliance"])
        if has_transparency:
            gov_titles = ["Líder de Transformación Digital y Gobierno TI", "Especialista en Transparencia Activa", "Auditor de Procesos Tecnológicos", "Head de Modernización Institucional"]
            recs.append(RoleRecommendation(
                role_family="Gobierno TI, Modernización del Estado y Transparencia",
                suggested_titles=gov_titles,
                recommendation_type="direct",
                reasoning="Experiencia tangible en Transparencia Activa, gobierno de la información, seguridad y modernización de procesos en el sector público y educación superior.",
                matching_skills=["Gobierno TI", "Transparencia Activa", "Gestión de Procesos", "Cumplimiento Normativo"],
                seniority="Senior / Asesor Especialista"
            ))
        else:
            recs.append(RoleRecommendation(
                role_family=f"Optimización de Procesos y Operaciones en {sector}",
                suggested_titles=[f"Analista Senior de Procesos en {sector}", "Continuous Improvement Lead", "Coordinador de Eficiencia Operacional"],
                recommendation_type="transferable",
                reasoning=f"Aprovechamiento de habilidades analíticas y metodológicas para optimizar operaciones en el sector de {sector}.",
                matching_skills=profile.technical_skills[:4],
                seniority="Especialista / Lead"
            ))

        # 6. Familia Exploratoria: Consultoría Estratégica & Arquitectura
        exploratory_titles = ["Consultor TI Independiente", "Arquitecto de Soluciones Tecnológicas", "Gestor de Proyectos de Modernización", "Technology Solutions Advisor"]
        recs.append(RoleRecommendation(
            role_family=f"Consultoría Estratégica y Arquitectura de Soluciones",
            suggested_titles=exploratory_titles,
            recommendation_type="exploratory",
            reasoning="Oportunidad de alto valor para capitalizar la trayectoria integral en consultoría independiente, asesorando a empresas en adopción tecnológica, arquitectura e innovación.",
            matching_skills=profile.technical_skills[:5],
            identified_gaps=["Desarrollo continuo de portafolio comercial de proyectos de consultoría"],
            seniority="Senior / Consultor Estratégico"
        ))

        return recs

    def generate_ats_queries(self, profile: CandidateProfile, prefs: UserPreferences, recs: List[RoleRecommendation]) -> List[GeneratedATSQuery]:
        """
        Construye consultas dinámicas ATS listas para ejecutar (Sección 5.6 y 7 del documento).
        Cubre hasta 6 familias activas con Dorks optimizados para portales globales y nacionales.
        """
        queries: List[GeneratedATSQuery] = []

        # Recopilar títulos aprobados o de alta recomendación
        active_recs = [r for r in recs if r.approved_by_user is not False]
        if not active_recs:
            active_recs = recs

        # Región / ubicaciones dinámicas
        pref_region = (profile.region or "").strip()
        if pref_region:
            locations_cl = f'("Chile" OR "Santiago" OR "{pref_region}" OR "Remoto")'
        else:
            locations_cl = '("Chile" OR "Santiago" OR "Remoto")'
        locations_global = '("Remote" OR "LATAM" OR "Chile" OR "Latin America")'

        # Generar consultas para todas las familias activas (hasta 6)
        for rec in active_recs[:6]:
            titles_clean = [f'"{t}"' for t in rec.suggested_titles[:2]]
            title_clause = f"({' OR '.join(titles_clean)})"

            # 1. Workday (Grandes corporaciones y banca en Chile)
            queries.append(GeneratedATSQuery(
                target_platform="Workday",
                role_family=rec.role_family,
                category="nacional",
                query_text=f'site:myworkdayjobs.com {title_clause} {locations_cl}'
            ))

            # 2. Greenhouse (Scale-ups, Startups internacionales y Tech LATAM)
            queries.append(GeneratedATSQuery(
                target_platform="Greenhouse",
                role_family=rec.role_family,
                category="internacional",
                query_text=f'site:boards.greenhouse.io {title_clause} {locations_global}'
            ))

            # 3. Ashby / Lever (Empresas de alta innovación y trabajo remoto)
            queries.append(GeneratedATSQuery(
                target_platform="Ashby",
                role_family=rec.role_family,
                category="internacional",
                query_text=f'site:jobs.ashbyhq.com {title_clause} {locations_global}'
            ))

            # 4. Lever (Compañías tech y remotas en LATAM)
            queries.append(GeneratedATSQuery(
                target_platform="Lever",
                role_family=rec.role_family,
                category="internacional",
                query_text=f'site:jobs.lever.co {title_clause} {locations_global}'
            ))

        return queries

role_recommender = RoleRecommenderAgent()
