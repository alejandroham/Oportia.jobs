"""
Brechas reales: requisitos de las ofertas guardadas/evaluadas vs. la experiencia del CV.

- Con IA: una sola consulta. Clasifica cada requisito en "cumple", "parcial" (cumple en parte o
  transfiere experiencia de otro cargo) o "brecha", citando evidencia TEXTUAL del CV.
- Sin IA (o si la IA no está disponible): reglas con un diccionario de requisitos de todas las áreas.
- Sin estado: no guarda nada en el servidor.
"""

import json
import logging
import re
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel

from app.agents.llm_provider import llm, LLMProviderError, AIRestingError
from app.models.schemas import CandidateProfile, JobPosting, UserPreferences
from app.utils.keywords import keyword_matches, normalize

logger = logging.getLogger(__name__)


class GapItem(BaseModel):
    requirement: str
    status: str  # "cumple" | "parcial" | "brecha"
    evidence: Optional[str] = None
    job_titles: List[str] = []
    area: Optional[str] = None
    course_query: str = ""


class GapAnalysis(BaseModel):
    items: List[GapItem] = []
    method: str = "reglas"  # "ia" | "reglas"
    jobs_analyzed: int = 0
    note: Optional[str] = None


# Requisitos frecuentes por área (se buscan en las ofertas). Mantener en minúsculas sin tildes no
# es necesario: keyword_matches normaliza.
REQUIREMENT_TERMS: Dict[str, List[str]] = {
    "General": ["Excel", "Excel avanzado", "Inglés", "Licencia de conducir clase B", "Licencia de conducir clase D",
                "Atención de público", "Trabajo en equipo", "Turnos rotativos", "Office", "Liderazgo"],
    "Informática": ["Soporte TI", "Mesa de ayuda", "Redes", "Windows Server", "Microsoft 365", "Active Directory",
                    "Ciberseguridad", "SQL", "Linux", "ITIL", "Virtualización", "Python", "Cloud"],
    "Salud": ["TENS", "Signos vitales", "Curaciones", "IAAS", "Registro clínico", "Urgencia", "RCP",
              "Administración de medicamentos", "Superintendencia de Salud", "Toma de muestras"],
    "Educación": ["Planificación curricular", "Evaluación de aprendizajes", "Educación diferencial",
                  "Convivencia escolar", "Primera infancia", "Inclusión"],
    "Comercio": ["Ventas", "Manejo de caja", "Metas comerciales", "CRM", "Postventa", "Negociación"],
    "Logística": ["Control de inventario", "Bodega", "Despacho", "Grúa horquilla", "WMS", "SAP", "Picking"],
    "Administración": ["Contabilidad", "Remuneraciones", "Conciliaciones bancarias", "ERP", "Facturación",
                       "Presupuesto", "Gestión de personas"],
    "Construcción": ["Lectura de planos", "AutoCAD", "Prevención de riesgos", "Mantención", "Electricidad",
                     "Supervisión de obra", "Control de calidad", "BIM", "Revit", "Cubicaciones",
                     "Presupuesto de obra", "MS Project", "Lean Construction", "Programación de obra",
                     "Informes técnicos", "Construcción sostenible"],
    "Gastronomía": ["Manipulación de alimentos", "Inocuidad alimentaria", "Cocina"],
    "Sector público": ["Ley de Transparencia", "Compras públicas", "Gestión pública", "Intervención social"],
}


def _profile_evidence(profile: CandidateProfile) -> List[Tuple[str, str]]:
    """Fuentes de evidencia del CV: (texto, cómo citarlo)."""
    out: List[Tuple[str, str]] = []
    # La profesión declarada también es evidencia (un TENS no tiene "brecha" de TENS).
    for p in [profile.primary_profession] + list(profile.secondary_professions or []):
        if p:
            out.append((p, f"Profesión: {p}"))
    if profile.headline and normalize(profile.headline) != "profesional":
        out.append((profile.headline, f"Titular del CV: {profile.headline}"))
    for s in (profile.technical_skills or []) + (profile.keywords or []) + (profile.soft_skills or []):
        out.append((s, f"Habilidad declarada: {s}"))
    for c in profile.certifications or []:
        out.append((c, f"Certificación: {c}"))
    for e in profile.education or []:
        title = " ".join(x for x in [e.degree, e.field_of_study] if x)
        out.append((title, f"Título: {title}" + (f" ({e.institution})" if e.institution else "")))
    for exp in profile.experiences or []:
        text = " ".join([exp.role or "", exp.description or "", " ".join(exp.bullet_achievements or []), " ".join(exp.technologies or [])])
        out.append((text, f"Experiencia: {exp.role} en {exp.company}"))
    for lang, level in (profile.languages or {}).items():
        out.append((lang, f"Idioma: {lang} ({level})"))
    return out


def _mentions(text: str, term: str) -> bool:
    """keyword_matches ignora letras sueltas; la clase de licencia (B, D, A2…) debe calzar exacta."""
    m = re.search(r"clase\s+([a-z]\d?)$", normalize(term))
    if m:
        return re.search(r"\bclase\s+" + m.group(1) + r"\b", normalize(text)) is not None
    return keyword_matches(text, term)


def _rule_based(profile: CandidateProfile, jobs: List[JobPosting]) -> List[GapItem]:
    evidence_sources = _profile_evidence(profile)
    candidates: Dict[str, str] = {}
    for area, terms in REQUIREMENT_TERMS.items():
        for t in terms:
            candidates.setdefault(t, area)
    for j in jobs:
        for tag in j.tags or []:
            if 2 < len(tag) < 40:
                candidates.setdefault(tag, None)

    items: List[GapItem] = []
    seen = set()
    for term, area in candidates.items():
        key = normalize(term)
        if key in seen:
            continue
        titles = [j.title for j in jobs if _mentions(f"{j.title} {j.description or ''} {' '.join(j.tags or [])}", term)]
        if not titles:
            continue
        seen.add(key)
        evidence = next((cite for text, cite in evidence_sources if _mentions(text, term)), None)
        items.append(GapItem(
            requirement=term,
            status="cumple" if evidence else "brecha",
            evidence=evidence,
            job_titles=sorted(set(titles)),
            area=area,
            course_query=term,
        ))
    # Brechas primero, y las que piden más ofertas arriba.
    items.sort(key=lambda g: (g.status != "brecha", -len(g.job_titles), g.requirement))
    return items[:25]


def _ai_based(profile: CandidateProfile, jobs: List[JobPosting], prefs: UserPreferences) -> List[GapItem]:
    cv = {
        "profesion": profile.primary_profession or profile.headline,
        "otras_profesiones": profile.secondary_professions,
        "experiencias": [
            {"cargo": e.role, "empresa": e.company, "periodo": f"{e.start_date} - {e.end_date or 'Actual'}",
             "descripcion": (e.description or "")[:400], "logros": (e.bullet_achievements or [])[:4]}
            for e in (profile.experiences or [])[:6]
        ],
        "educacion": [f"{e.degree} {e.field_of_study} ({e.institution})".strip() for e in profile.education or []],
        "certificaciones": profile.certifications,
        "habilidades": (profile.technical_skills or []) + (profile.keywords or []),
        "idiomas": profile.languages,
    }
    offers = [{"id": j.id, "cargo": j.title, "empresa": j.company, "descripcion": (j.description or "")[:700]} for j in jobs]
    prompt = f"""
Compara los REQUISITOS de estas ofertas laborales (cualquier área) con el CV real del candidato.

CV:
{json.dumps(cv, ensure_ascii=False)}

OFERTAS:
{json.dumps(offers, ensure_ascii=False)}

Para cada requisito importante (conocimientos, títulos, certificaciones, licencias, idiomas, experiencia):
- "cumple": el CV lo demuestra. En "evidencia" cita TEXTUALMENTE el dato del CV (cargo, título, habilidad).
- "parcial": cumple en parte o tiene experiencia transferible (explica cuál, citando el CV).
- "brecha": no aparece en el CV. "evidencia" vacía.
NO inventes experiencia. Máximo 15 requisitos, los más pedidos primero.
En "buscar_curso" pon 2 a 5 palabras para buscar un curso que cierre la brecha (en español).

RESPONDE SOLO JSON:
{{"requisitos": [{{"requisito": "...", "estado": "cumple|parcial|brecha", "evidencia": "...", "ofertas": ["id"], "area": "...", "buscar_curso": "..."}}]}}
"""
    res = llm.generate_json(prompt, system_instruction="Eres un orientador laboral riguroso y honesto. Nunca inventas datos del CV.") or {}
    raw = res.get("requisitos") if isinstance(res, dict) else None
    by_id = {j.id: j.title for j in jobs}
    items: List[GapItem] = []
    for r in raw or []:
        if not isinstance(r, dict) or not r.get("requisito"):
            continue
        status = str(r.get("estado", "")).lower()
        if status not in ("cumple", "parcial", "brecha"):
            continue
        evidence = (r.get("evidencia") or "").strip() or None
        if status == "brecha":
            evidence = None
        items.append(GapItem(
            requirement=str(r["requisito"])[:120],
            status=status,
            evidence=evidence[:300] if evidence else None,
            job_titles=[by_id[i] for i in (r.get("ofertas") or []) if i in by_id] or [j.title for j in jobs[:1]],
            area=(r.get("area") or None),
            course_query=str(r.get("buscar_curso") or r["requisito"])[:80],
        ))
    order = {"brecha": 0, "parcial": 1, "cumple": 2}
    items.sort(key=lambda g: (order[g.status], -len(g.job_titles)))
    return items


def analyze_gaps(profile: CandidateProfile, jobs: List[JobPosting], prefs: Optional[UserPreferences] = None, use_ai: bool = True) -> GapAnalysis:
    jobs = jobs[:8]
    if not jobs:
        return GapAnalysis(note="Guarda o evalúa ofertas para comparar sus requisitos con tu CV.")
    if use_ai:
        try:
            items = _ai_based(profile, jobs, prefs or UserPreferences())
            if items:
                return GapAnalysis(items=items, method="ia", jobs_analyzed=len(jobs))
        except AIRestingError as e:
            return GapAnalysis(items=_rule_based(profile, jobs), method="reglas", jobs_analyzed=len(jobs), note=e.message)
        except LLMProviderError as e:
            logger.info(f"Brechas sin IA ({e.code}); se usan reglas.")
        except Exception as e:  # noqa: BLE001 - nunca dejar la pantalla sin resultado
            logger.warning(f"Brechas con IA fallaron: {e}")
    return GapAnalysis(items=_rule_based(profile, jobs), method="reglas", jobs_analyzed=len(jobs))
