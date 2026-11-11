import json
import logging
from typing import Dict, Any, List, Optional
from app.models.schemas import (
    CandidateProfile, UserPreferences, JobPosting, FitEvaluation,
    FitDimensionScore, EvaluatorRoleScore, RequirementEvidenceItem,
    PotentialFitProjection, DirectorSynthesis
)
from app.agents.llm_provider import llm
from app.storage.db import db
from app.utils.chile_regions import calculate_geographic_priority

logger = logging.getLogger(__name__)

class FitEvaluator:
    """
    Comité Oportia (Evaluación Asistida de Compatibilidad Laboral de Oportia Jobs IA).
    Simula 5 evaluadores especializados e independientes coordinados por un Agente Director Supervisor:
    1. Reclutador de Recursos Humanos (peso: 25%)
    2. Jefe Contratante o Hiring Manager (peso: 25%)
    3. Evaluador Técnico Especialista (peso: 25%)
    4. Especialista ATS (peso: 15%)
    5. Consultor Estratégico de Carrera (peso: 10%)
    
    Calcula el Fit Score ponderado real y el Potential Fit Score (proyección tras subsanar brechas).
    """

    def evaluate(self, job: JobPosting, profile: CandidateProfile, preferences: UserPreferences) -> FitEvaluation:
        # Pre-check remote dealbreaker if user strictly requested remote
        rule_deal_breakers: List[str] = []
        if preferences.remote_only and not job.is_remote:
            rule_deal_breakers.append("La vacante requiere presencia física y tienes configurada preferencia 100% Remota.")

        # Prepare context for LLM multiagent evaluation
        system_instruction = (
            "Eres el Director y Coordinador del Comité Oportia de Evaluación de Compatibilidad de Oportia Jobs IA. "
            "Tu misión es orquestar una deliberación multiagente objetiva, rigurosa y sin sesgo complaciente "
            "entre 5 evaluadores especializados e independientes, y luego sintetizar sus dictámenes.\n\n"
            "Los 5 evaluadores del Comité son:\n"
            "1. Reclutador de Recursos Humanos (peso 25%): Formación académica, años de experiencia, trayectoria, coherencia y competencias transversales.\n"
            "2. Jefe Contratante / Hiring Manager (peso 25%): Capacidad para asumir funciones, autonomía, toma de decisiones, resolución de problemas y valor que aporta al área.\n"
            "3. Evaluador Técnico Especialista (peso 25%): Tecnologías, frameworks, lenguajes, infraestructura, experiencia práctica comprobable y proyectos relevantes.\n"
            "4. Especialista ATS (peso 15%): Palabras clave de la oferta, legibilidad en filtros automatizados, títulos de cargo y taxonomías.\n"
            "5. Consultor Estratégico de Carrera (peso 10%): Sentido y correspondencia con la trayectoria, posibilidades de crecimiento y salto profesional.\n\n"
            "Reglas de Oro del Comité:\n"
            "- Cada evaluador califica de 0 a 100 con honestidad radical.\n"
            "- Distinguir entre: competencia demostrada, declarada sin evidencia suficiente, transferible desde otra experiencia, o no identificada en el CV.\n"
            "- Identificar contradicciones entre evaluadores (ej. RRHH lo ve apto pero Técnico detecta falta de stack obligatorio).\n"
            "- El Director consolida el Fit Score ponderado y proyecta el Potential Fit Score si se subsanan brechas."
        )

        profile_summary = {
            "name": profile.name,
            "headline": profile.headline or "Profesional",
            "years_experience": profile.years_of_experience,
            "primary_profession": profile.primary_profession or profile.headline,
            "technical_skills": profile.technical_skills,
            "soft_skills": profile.soft_skills,
            "languages": profile.languages,
            "education": [{"degree": e.degree, "institution": e.institution, "field": e.field_of_study} for e in profile.education],
            "certifications": profile.certifications,
            "recent_roles": [
                {
                    "role": e.role,
                    "company": e.company,
                    "period": f"{e.start_date} - {e.end_date}",
                    "description": e.description[:250],
                    "technologies": e.technologies,
                    "bullet_achievements": e.bullet_achievements[:3]
                }
                for e in profile.experiences[:5]
            ]
        }

        prompt = f"""
EVALUACIÓN MULTIAGENTE DE COMPATIBILIDAD LABORAL (COMITÉ OPORTIA).

PERFIL PROFESIONAL DEL CANDIDATO:
{json.dumps(profile_summary, ensure_ascii=False, indent=2)}

PREFERENCIAS DEL CANDIDATO Y REGLAS ELIMINATORIAS:
- Roles objetivo: {', '.join(preferences.target_roles) if preferences.target_roles else 'No especificados'}
- Modalidad remota obligatoria: {'Sí' if preferences.remote_only else 'Flexible'}
- Rango salarial mínimo: {preferences.min_salary_usd or preferences.min_salary_clp or 'No especificado'}
- Deal Breakers configurados: {json.dumps(preferences.deal_breakers, ensure_ascii=False)}
- Insights aprendidos de historial: {json.dumps(preferences.auto_learned_insights, ensure_ascii=False)}

OFERTA LABORAL A EVALUAR:
- Título del cargo: {job.title}
- Empresa: {job.company}
- Ubicación / Modalidad: {job.location} ({'Remoto' if job.is_remote else 'Presencial / Híbrido'})
- Rango Salarial declarado: {job.salary_range or 'No especificado'}
- Descripción completa:
{job.description[:4500]}

INSTRUCCIÓN:
Genera la deliberación completa del Comité en formato JSON estricto con la siguiente estructura:

{{
  "committee_evaluations": [
    {{
      "role_id": "rrhh",
      "role_name": "Reclutador RR. HH.",
      "score": 85,
      "weight_percentage": 25,
      "justification": "Evaluación detallada de formación, años y trayectoria...",
      "strengths": ["Fortaleza 1 detectada"],
      "gaps": ["Brecha 1"],
      "key_question": "¿Este candidato cumple con el perfil general que estamos buscando?",
      "question_verdict": "Cumple con el perfil general requerido con sólida trayectoria."
    }},
    {{
      "role_id": "hiring_manager",
      "role_name": "Jefe Contratante (Hiring Manager)",
      "score": 80,
      "weight_percentage": 25,
      "justification": "Evaluación de autonomía, resolución de problemas y aporte al área...",
      "strengths": ["Autonomía demostrada en proyectos previos"],
      "gaps": ["Falta evidencia de liderazgo en equipos superiores a 10 personas"],
      "key_question": "¿Contrataría a esta persona para resolver las necesidades de mi área?",
      "question_verdict": "Sí, aporta solvencia operativa y experiencia comprobable."
    }},
    {{
      "role_id": "technical",
      "role_name": "Evaluador Técnico Especialista",
      "score": 82,
      "weight_percentage": 25,
      "justification": "Revisión de tecnologías, herramientas, metodologías y stack...",
      "strengths": ["Dominio práctico de tecnologías base"],
      "gaps": ["Falta evidencia explícita en una herramienta requerida"],
      "key_question": "¿Tiene los conocimientos y la experiencia técnica necesarios para desempeñar este trabajo?",
      "question_verdict": "Posee las competencias centrales; brecha subsanable en herramientas secundarias."
    }},
    {{
      "role_id": "ats",
      "role_name": "Especialista ATS",
      "score": 88,
      "weight_percentage": 15,
      "justification": "Análisis de palabras clave y legibilidad ante filtros automatizados...",
      "strengths": ["Alta densidad de términos afines"],
      "gaps": ["Se sugiere incluir explícitamente palabras clave del sector"],
      "key_question": "¿El currículum comunica correctamente la experiencia y es legible para los filtros automatizados?",
      "question_verdict": "Altamente legible; pasaría la criba de filtros ATS estándar."
    }},
    {{
      "role_id": "career_consultant",
      "role_name": "Consultor Estratégico de Carrera",
      "score": 86,
      "weight_percentage": 10,
      "justification": "Alineación de la vacante con la progresión profesional del usuario...",
      "strengths": ["Representa una progresión natural de seniority"],
      "gaps": ["Requiere consolidar competencias de gestión"],
      "key_question": "¿Esta oportunidad representa un buen movimiento profesional para el candidato?",
      "question_verdict": "Excelente oportunidad de crecimiento profesional y posicionamiento."
    }}
  ],
  "requirements_matrix": [
    {{
      "requirement": "Requisito extraído de la vacante",
      "cv_evidence": "Evidencia encontrada en el CV o 'Sin evidencia suficiente'",
      "status": "cumplido" | "parcial" | "pendiente" | "no_cumplido",
      "competency_status": "demostrada" | "declarada_sin_evidencia" | "transferible" | "no_identificada" | "confirmada_ausente",
      "importance": "excluyente" | "deseable" | "general"
    }}
  ],
  "potential_projection": {{
    "potential_score": 92,
    "score_delta": 8,
    "target_competencies": ["Competencia o herramienta a acreditar"],
    "required_evidence": ["Tipo de evidencia requerida (curso oficial, certificación o proyecto práctico)"],
    "estimated_effort": "1 a 3 semanas",
    "reasoning": "Acreditando la competencia X y reforzando Y en el CV, el ajuste potencial se eleva significativamente."
  }},
  "director_synthesis": {{
    "summary": "Dictamen consolidado del Director integrando los 5 evaluadores...",
    "contradictions_detected": ["Contradicciones o discrepancias entre los evaluadores"],
    "critical_deal_breakers": [],
    "missing_evidence_vs_real_gaps": "Análisis de si las brechas son de redacción en el CV o falta real de conocimiento.",
    "final_recommendation": "Recomendable postular",
    "suggested_actions": [
      "Adaptar el CV en Laboratorio CV para destacar resultados cuantificados",
      "Enviar brechas técnicas al Coach IA para activar ruta de estudio",
      "Preparar respuestas de entrevista basadas en el método STAR"
    ]
  }},
  "strengths": [
    "Fortaleza consolidada 1",
    "Fortaleza consolidada 2"
  ],
  "missing_skills": [
    "Habilidad o requisito ausente 1",
    "Habilidad o requisito ausente 2"
  ],
  "deal_breakers_found": []
}}
"""

        res = llm.generate_json(prompt, system_instruction=system_instruction)

        # Process committee evaluations
        raw_evals = res.get("committee_evaluations", [])
        committee_evals: List[EvaluatorRoleScore] = []

        default_specs = [
            ("rrhh", "Reclutador RR. HH.", 25, "¿Este candidato cumple con el perfil general que estamos buscando?"),
            ("hiring_manager", "Jefe Contratante", 25, "¿Contrataría a esta persona para resolver las necesidades de mi área?"),
            ("technical", "Evaluador Técnico", 25, "¿Tiene los conocimientos y la experiencia técnica necesarios para desempeñar este trabajo?"),
            ("ats", "Especialista ATS", 15, "¿El currículum comunica correctamente la experiencia y es legible para los filtros automatizados?"),
            ("career_consultant", "Consultor Estratégico", 10, "¿Esta oportunidad representa un buen movimiento profesional para el candidato?")
        ]

        if raw_evals and len(raw_evals) == 5:
            for item in raw_evals:
                try:
                    committee_evals.append(EvaluatorRoleScore(**item))
                except Exception as e:
                    logger.warning(f"Error parsing committee evaluator item: {e}")

        if len(committee_evals) != 5:
            committee_evals = []
            for role_id, role_name, weight, q in default_specs:
                committee_evals.append(
                    EvaluatorRoleScore(
                        role_id=role_id,
                        role_name=role_name,
                        score=78,
                        weight_percentage=weight,
                        justification=f"Evaluación independiente del rol {role_name}.",
                        strengths=["Alineación con el perfil general del candidato"],
                        gaps=["Revisar detalles específicos de la vacante"],
                        key_question=q,
                        question_verdict="Cumple con las condiciones iniciales para avanzar a revisión."
                    )
                )

        # Mathematical weighted score calculation: 25% + 25% + 25% + 15% + 10%
        calc_score = 0.0
        for ev in committee_evals:
            calc_score += ev.score * (ev.weight_percentage / 100.0)
        overall = int(round(calc_score))

        # Merge deal breakers
        found_db = list(res.get("deal_breakers_found", []))
        for d in rule_deal_breakers:
            if d not in found_db:
                found_db.append(d)

        # If a critical deal breaker is present, cap the score
        if found_db:
            overall = min(overall, 45)

        # Standard interpretation according to document table (Sección 2.4):
        # 90-100%: Compatibilidad muy alta -> Postulación prioritaria
        # 80-89%: Compatibilidad alta -> Recomendable postular
        # 70-79%: Compatibilidad media -> Revisar brechas y adaptar CV
        # 60-69%: Compatibilidad baja -> Evaluar si conviene invertir tiempo
        # <60%: Compatibilidad muy baja -> En principio, no priorizar
        if overall >= 90:
            verdict = "Postulación prioritaria"
        elif overall >= 80:
            verdict = "Recomendable postular"
        elif overall >= 70:
            verdict = "Revisar brechas y adaptar CV"
        elif overall >= 60:
            verdict = "Evaluar si conviene invertir tiempo"
        else:
            verdict = "En principio, no priorizar"

        # Potential Fit Score: conditioned projection after addressing viable gaps
        raw_proj = res.get("potential_projection") or {}
        potential_score = raw_proj.get("potential_score")
        if not potential_score or potential_score < overall:
            potential_score = min(98, overall + 8)

        if found_db:
            # If deal breaker exists, potential is limited unless deal breaker is resolved
            potential_score = min(potential_score, 60)

        potential_projection = PotentialFitProjection(
            potential_score=potential_score,
            score_delta=max(0, potential_score - overall),
            target_competencies=raw_proj.get("target_competencies", res.get("missing_skills", [])[:3]),
            required_evidence=raw_proj.get("required_evidence", ["Cursos verificados en Coach IA", "Proyectos o certificaciones"]),
            estimated_effort=raw_proj.get("estimated_effort", "1 a 3 semanas"),
            reasoning=raw_proj.get("reasoning", "Acreditando las competencias identificadas y adaptando el CV, el nivel de ajuste se eleva sustancialmente.")
        )

        # Requirements Matrix
        raw_matrix = res.get("requirements_matrix", [])
        requirements_matrix: List[RequirementEvidenceItem] = []
        for rm in raw_matrix:
            try:
                requirements_matrix.append(RequirementEvidenceItem(**rm))
            except Exception as e:
                logger.warning(f"Error parsing requirement item: {e}")

        # Director Synthesis
        raw_director = res.get("director_synthesis") or {}
        director_synthesis = DirectorSynthesis(
            summary=raw_director.get("summary", f"Comité completado con Fit Score ponderado de {overall}/100 ({verdict})."),
            contradictions_detected=raw_director.get("contradictions_detected", []),
            critical_deal_breakers=found_db,
            missing_evidence_vs_real_gaps=raw_director.get("missing_evidence_vs_real_gaps", "Se recomienda distinguir entre experiencia no comunicada en el CV y brechas formativas reales."),
            final_recommendation=raw_director.get("final_recommendation", verdict),
            suggested_actions=raw_director.get("suggested_actions", [
                "Adaptar el CV en Laboratorio CV para este cargo",
                "Enviar brechas detectadas al Coach IA",
                "Preparar simulación de entrevista STAR"
            ])
        )

        # Backward compatibility dimension scores for legacy components
        dim_scores = [
            FitDimensionScore(dimension="Reclutador RR. HH.", score=committee_evals[0].score, reasoning=committee_evals[0].justification[:120]),
            FitDimensionScore(dimension="Jefe Contratante", score=committee_evals[1].score, reasoning=committee_evals[1].justification[:120]),
            FitDimensionScore(dimension="Evaluador Técnico", score=committee_evals[2].score, reasoning=committee_evals[2].justification[:120]),
            FitDimensionScore(dimension="Especialista ATS", score=committee_evals[3].score, reasoning=committee_evals[3].justification[:120]),
            FitDimensionScore(dimension="Consultor Estratégico", score=committee_evals[4].score, reasoning=committee_evals[4].justification[:120])
        ]

        evaluation = FitEvaluation(
            job_id=job.id,
            overall_score=overall,
            potential_fit_score=potential_score,
            potential_projection=potential_projection,
            verdict=verdict,
            committee_evaluations=committee_evals,
            director_synthesis=director_synthesis,
            requirements_matrix=requirements_matrix,
            dimension_scores=dim_scores,
            strengths=res.get("strengths", ["Trayectoria compatible con el perfil buscado"]),
            missing_skills=res.get("missing_skills", []),
            deal_breakers_found=found_db,
            recommendation_summary=director_synthesis.summary
        )

        # Geographic priority identification (Chilean regional metadata)
        user_reg = preferences.preferred_region or profile.region or None
        pref_comm = preferences.preferred_communes[0] if preferences.preferred_communes else (profile.commune or None)
        geo_cat, boost, reg, comm = calculate_geographic_priority(
            job.location,
            user_region=user_reg,
            user_commune=pref_comm
        )
        job.region = reg
        job.commune = comm
        job.is_user_region = (geo_cat == "user_region")
        job.modality = "Remoto" if job.is_remote else "Presencial"

        # Update the job with the score and geographic metadata in the database
        db.update_job_status(job.id, status=job.status, fit_score=overall)
        db.save_jobs([job])

        # Persist full evaluation in Database (evaluations.json) so it can be queried at any time
        db.save_evaluation(evaluation)

        return evaluation

fit_evaluator = FitEvaluator()