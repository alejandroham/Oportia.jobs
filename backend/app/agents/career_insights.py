"""
"Qué busco" y "Mis logros" a partir del CV, con UNA sola consulta a la IA:
- Cargos afines a la experiencia real, cada uno con un resumen breve de por qué calza (citando el CV).
- Logros en formato STAR, SOLO con hechos del CV (sin inventar cifras).
Sin IA: cargos y logros por reglas, a partir de los cargos y logros que ya están en el CV.
Sin estado: no guarda nada en el servidor.
"""

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel

from app.agents.llm_provider import AIRestingError, AINotConnectedError, LLMProviderError, llm
from app.agents.profile_analyzer import suggest_roles_from_experience
from app.models.schemas import CandidateProfile, UserPreferences

logger = logging.getLogger(__name__)

CATEGORIES = {"directo": "Tu experiencia directa", "ascenso": "Siguiente paso", "transferible": "Por tus habilidades transferibles"}


class SuggestedRole(BaseModel):
    title: str
    category: str = "directo"          # directo | ascenso | transferible
    category_label: str = ""
    summary: str = ""                  # por qué calza, en 1-2 frases
    evidence: List[str] = []           # cargos o datos del CV que lo respaldan
    level: str = ""                    # p. ej. "Técnico / supervisión"


class StarAchievement(BaseModel):
    id: str
    title: str
    situation_and_task: str = ""
    action: str = ""
    result_and_metrics: str = ""
    key_skills: List[str] = []
    source: str = "cv_ia"
    created_at: str = ""


class CareerInsights(BaseModel):
    roles: List[SuggestedRole] = []
    achievements: List[StarAchievement] = []
    method: str = "reglas"             # ia | reglas
    note: Optional[str] = None


PROMPT = """
Eres un orientador laboral en Chile. A partir del CV real de la persona:

A) Propón entre 5 y 8 CARGOS a los que puede postular, como se publican en portales de empleo de Chile:
   - "directo": cargos que ya ejerció o equivalentes (mismo nivel).
   - "ascenso": el siguiente paso natural según sus años y responsabilidades (sin exagerar el nivel).
   - "transferible": cargos de otra área donde sus competencias sirven.
   Para cada uno escribe "resumen": 1 o 2 frases que expliquen por qué calza, citando su experiencia real
   (cargo, empresa, años, títulos). En "evidencia" lista los cargos o datos del CV que lo respaldan.
   NO propongas cargos por debajo de su nivel (por ejemplo, ayudante o jornal para un supervisor).

B) Extrae entre 2 y 6 LOGROS en formato STAR, SOLO con hechos del CV:
   - "situacion_tarea": contexto y responsabilidad; "accion": qué hizo; "resultado": qué logró.
   - Si el CV no trae una cifra, NO la inventes: describe el resultado sin números.
   - "habilidades": 2 a 4 competencias que demuestra.

CV:
{cv}

LO QUE YA BUSCA (no repitas estos cargos): {current}

RESPONDE SOLO JSON:
{{"cargos": [{{"titulo": "...", "categoria": "directo|ascenso|transferible", "resumen": "...", "evidencia": ["..."], "nivel": "..."}}],
  "logros": [{{"titulo": "...", "situacion_tarea": "...", "accion": "...", "resultado": "...", "habilidades": ["..."]}}]}}
"""


def _cv_for_prompt(profile: CandidateProfile) -> Dict[str, Any]:
    return {
        "profesion": profile.primary_profession or profile.headline,
        "otras_profesiones": profile.secondary_professions,
        "anios_experiencia": profile.years_of_experience,
        "resumen": (profile.summary or "")[:800],
        "experiencias": [
            {"cargo": e.role, "empresa": e.company, "periodo": f"{e.start_date} - {e.end_date or ''}".strip(" -"),
             "funciones": (e.description or "")[:500], "logros": (e.bullet_achievements or [])[:6]}
            for e in (profile.experiences or [])[:8]
        ],
        "titulos": [f"{e.degree} {e.field_of_study} ({e.institution})".strip() for e in profile.education or []],
        "cursos": profile.certifications[:12],
        "habilidades": (profile.technical_skills or [])[:20] + (profile.keywords or [])[:10],
    }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _norm(t: str) -> str:
    return re.sub(r"\s+", " ", (t or "").strip().lower())


def _parse_ai(result: Dict[str, Any], current: List[str]) -> Tuple[List[SuggestedRole], List[StarAchievement]]:
    taken = {_norm(c) for c in current}
    roles: List[SuggestedRole] = []
    for r in (result.get("cargos") or []):
        if not isinstance(r, dict) or not str(r.get("titulo") or "").strip():
            continue
        title = str(r["titulo"]).strip()[:90]
        if _norm(title) in taken:
            continue
        taken.add(_norm(title))
        cat = str(r.get("categoria") or "directo").lower()
        cat = cat if cat in CATEGORIES else "directo"
        roles.append(SuggestedRole(
            title=title, category=cat, category_label=CATEGORIES[cat],
            summary=str(r.get("resumen") or "")[:300],
            evidence=[str(x)[:120] for x in (r.get("evidencia") or [])][:4],
            level=str(r.get("nivel") or "")[:60],
        ))
    achievements: List[StarAchievement] = []
    for a in (result.get("logros") or []):
        if not isinstance(a, dict) or not (a.get("accion") or a.get("resultado")):
            continue
        achievements.append(StarAchievement(
            id=f"star_{uuid.uuid4().hex[:10]}", title=str(a.get("titulo") or "Logro")[:120],
            situation_and_task=str(a.get("situacion_tarea") or "")[:600], action=str(a.get("accion") or "")[:600],
            result_and_metrics=str(a.get("resultado") or "")[:400],
            key_skills=[str(x)[:40] for x in (a.get("habilidades") or [])][:4], created_at=_now(),
        ))
    return roles, achievements


def _rule_based(profile: CandidateProfile, current: List[str]) -> Tuple[List[SuggestedRole], List[StarAchievement]]:
    taken = {_norm(c) for c in current}
    mapping = {"direct": "directo", "leadership": "ascenso", "transferible": "transferible", "transferable": "transferible"}
    roles = []
    # Primero, los cargos que ya ejerció (lo más confiable), con su resumen.
    for e in profile.experiences or []:
        if e.role and _norm(e.role) not in taken and len(roles) < 4:
            taken.add(_norm(e.role))
            period = " – ".join(x for x in [e.start_date, e.end_date] if x)
            roles.append(SuggestedRole(
                title=e.role, category="directo", category_label=CATEGORIES["directo"],
                summary=f"Ejerciste este cargo en {e.company or 'tu experiencia'}{f' ({period})' if period else ''}.",
                evidence=[f"{e.role}, {e.company}".strip(", ")], level=""))
    for r in suggest_roles_from_experience(profile):
        if _norm(r["title"]) in taken:
            continue
        taken.add(_norm(r["title"]))
        cat = mapping.get(r["category"], "directo")
        roles.append(SuggestedRole(title=r["title"], category=cat, category_label=CATEGORIES[cat],
                                   summary=r.get("reasoning", ""), evidence=[], level=r.get("seniority", "")))
    achievements = []
    for e in profile.experiences or []:
        for b in (e.bullet_achievements or [])[:2]:
            if len(b) < 15:
                continue
            achievements.append(StarAchievement(
                id=f"star_{uuid.uuid4().hex[:10]}", title=b[:80],
                situation_and_task=f"Como {e.role} en {e.company}.".strip(), action=b, result_and_metrics="",
                key_skills=[], source="cv", created_at=_now()))
    return roles[:8], achievements[:6]


def career_insights(profile: CandidateProfile, prefs: Optional[UserPreferences] = None, use_ai: bool = True) -> CareerInsights:
    current = list((prefs.target_roles if prefs else []) or [])
    if use_ai:
        try:
            result = llm.generate_json(
                PROMPT.format(cv=json.dumps(_cv_for_prompt(profile), ensure_ascii=False), current=json.dumps(current, ensure_ascii=False)),
                system_instruction="Orientador laboral honesto: nunca inventas experiencia, cifras ni títulos.",
            )
            roles, achievements = _parse_ai(result if isinstance(result, dict) else {}, current)
            if roles or achievements:
                return CareerInsights(roles=roles, achievements=achievements, method="ia")
        except AIRestingError as e:
            roles, achievements = _rule_based(profile, current)
            return CareerInsights(roles=roles, achievements=achievements, method="reglas", note=e.message)
        except AINotConnectedError:
            pass
        except LLMProviderError as e:
            logger.info(f"Cargos y logros sin IA ({e.code}).")
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Cargos y logros con IA fallaron: {e}")
    roles, achievements = _rule_based(profile, current)
    return CareerInsights(roles=roles, achievements=achievements, method="reglas",
                          note="Sugerencias básicas sin IA. Activa la IA para cargos afines con su resumen y logros STAR desde tu CV.")
