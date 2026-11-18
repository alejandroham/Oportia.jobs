"""
Qué experiencias van en un CV adaptado y qué tan largo es.

- La persona elige (modo "manual") o Opi elige las más relevantes para la oferta (modo "auto").
- Con IA: una consulta corta elige y explica en una frase por qué. Sin IA: coincidencia de palabras
  entre la experiencia y la oferta, más un pequeño bono por ser reciente.
- Las experiencias que no se desarrollan NO se ocultan: van en "Experiencia anterior", una línea por
  cargo (cargo · empresa · período), escrita por el servidor, no por la IA, para que nada se invente.
"""

import logging
import re
from typing import Dict, List, Optional, Tuple

from app.agents.llm_provider import USER_FACING_LLM_ERRORS, LLMProviderError, llm
from app.models.schemas import CandidateProfile, JobPosting, WorkExperience
from app.utils.keywords import stem, tokens

logger = logging.getLogger(__name__)

# Largo del CV: cuántas experiencias se desarrollan y cuántas viñetas por experiencia.
LENGTHS: Dict[str, Dict[str, Optional[int]]] = {
    "1": {"max_experiences": 3, "max_bullets": 3, "max_skills": 10},
    "2": {"max_experiences": 5, "max_bullets": 4, "max_skills": 16},
    "full": {"max_experiences": None, "max_bullets": 5, "max_skills": None},
}

LENGTH_PROMPTS = {
    "1": (
        "EXTENSIÓN OBLIGATORIA: el CV debe caber en UNA hoja A4. Perfil profesional de 2 a 3 líneas; "
        "máximo 10 competencias en una sola línea separada por ' · '; máximo 3 viñetas breves por experiencia "
        "(una línea cada una); educación y cursos en una línea por ítem; omite idiomas si no son relevantes."
    ),
    "2": (
        "EXTENSIÓN: el CV debe caber en DOS hojas A4 como máximo. Perfil profesional de 3 a 4 líneas; "
        "máximo 16 competencias; máximo 4 viñetas por experiencia."
    ),
    "full": "EXTENSIÓN: puedes usar el espacio necesario, pero sin repetir información.",
}

_EDU_HEADING = re.compile(r"^#{2,3}\s*(educaci[oó]n|formaci[oó]n|estudios|cursos|certificaci|idiomas)", re.I | re.M)
_PREV_HEADING = re.compile(r"^#{2,3}\s*experiencia\s+(anterior|previa|adicional)[^\n]*\n(?:(?!^#{1,3}\s).*\n?)*", re.I | re.M)


def normalize_length(value: Optional[str]) -> str:
    return value if value in LENGTHS else "2"


def _period(exp: WorkExperience) -> str:
    start = (exp.start_date or "").strip()
    end = (exp.end_date or "").strip()
    if end.lower() in ("present", "presente", "actual", "actualidad"):
        end = "actualidad"
    if start and end and not re.search(r"\s[-–a]\s", start):
        return f"{start} – {end}"
    return start or end


def _stems(text: str) -> set:
    return {stem(t) for t in tokens(text) if len(t) > 2}


def rule_based_selection(profile: CandidateProfile, job: JobPosting, max_n: int) -> Tuple[List[str], Dict[str, str]]:
    """Elige las experiencias con más palabras en común con la oferta (con un bono por ser reciente)."""
    job_stems = _stems(f"{job.title} {job.title} {job.description or ''}")
    scored = []
    for idx, exp in enumerate(profile.experiences):
        exp_text = " ".join([exp.role, exp.role, exp.description or "", " ".join(exp.technologies), " ".join(exp.bullet_achievements)])
        common = _stems(exp_text) & job_stems
        # Las experiencias suelen venir de la más reciente a la más antigua.
        recency = max(0.0, 2.0 - idx * 0.5)
        scored.append((len(common) + recency, idx, exp, common))
    best = sorted(scored, key=lambda s: (-s[0], s[1]))[:max_n]
    chosen = sorted(best, key=lambda s: s[1])  # se mantiene el orden original del CV
    reasons: Dict[str, str] = {}
    for _, idx, exp, common in chosen:
        words = [w for w in tokens(f"{exp.role} {' '.join(exp.technologies)}") if stem(w) in common][:3]
        if words:
            reasons[exp.id] = "Coincide con la oferta en: " + ", ".join(dict.fromkeys(words)) + "."
        elif idx == 0:
            reasons[exp.id] = "Es tu experiencia más reciente."
        else:
            reasons[exp.id] = "Aporta experiencia relacionada con el cargo."
    return [s[2].id for s in chosen], reasons


SELECTION_PROMPT = """
Elige las {max_n} experiencias laborales del candidato MÁS RELEVANTES para esta oferta.
Prioriza: cargo parecido, funciones y herramientas que pide la oferta, y experiencia reciente.

OFERTA:
{job}

EXPERIENCIAS DEL CANDIDATO (id: cargo · empresa · período — descripción):
{experiences}

RESPONDE SOLO JSON:
{{"elegidas": [{{"id": "id exacto", "razon": "una frase breve de por qué es relevante para esta oferta"}}]}}
"""


def ai_selection(profile: CandidateProfile, job: JobPosting, max_n: int) -> Optional[Tuple[List[str], Dict[str, str]]]:
    lines = []
    for exp in profile.experiences:
        desc = " ".join([exp.description or "", "; ".join(exp.bullet_achievements[:3])]).strip()[:260]
        lines.append(f"{exp.id}: {exp.role} · {exp.company} · {_period(exp)} — {desc}")
    prompt = SELECTION_PROMPT.format(
        max_n=max_n,
        job=f"{job.title} en {job.company}\n{(job.description or '')[:2500]}",
        experiences="\n".join(lines),
    )
    try:
        res = llm.generate_json(prompt, system_instruction="Eres un reclutador experto y honesto de cualquier área laboral.") or {}
    except USER_FACING_LLM_ERRORS:
        raise
    except LLMProviderError as e:
        logger.info(f"Selección de experiencias sin IA ({e.code}).")
        return None
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Selección de experiencias: la IA falló: {e}")
        return None
    valid = {exp.id for exp in profile.experiences}
    picked: Dict[str, str] = {}
    for item in (res.get("elegidas") if isinstance(res, dict) else None) or []:
        if isinstance(item, dict) and item.get("id") in valid and item["id"] not in picked:
            picked[item["id"]] = str(item.get("razon") or "").strip()[:160] or "Relevante para la oferta."
        if len(picked) >= max_n:
            break
    if not picked:
        return None
    ordered = [exp.id for exp in profile.experiences if exp.id in picked]
    return ordered, picked


def choose_experiences(
    profile: CandidateProfile,
    job: JobPosting,
    length: str,
    manual_ids: Optional[List[str]] = None,
    use_ai: bool = True,
) -> Tuple[List[str], Dict[str, str], str]:
    """Devuelve (ids elegidos en el orden del CV, razones por id, método: manual|todas|ia|reglas)."""
    all_ids = [exp.id for exp in profile.experiences]
    if manual_ids is not None:
        wanted = set(manual_ids)
        return [i for i in all_ids if i in wanted], {}, "manual"
    max_n = LENGTHS[length]["max_experiences"]
    if max_n is None or len(all_ids) <= max_n:
        return all_ids, {}, "todas"
    if use_ai:
        picked = ai_selection(profile, job, max_n)
        if picked:
            return picked[0], picked[1], "ia"
    ids, reasons = rule_based_selection(profile, job, max_n)
    return ids, reasons, "reglas"


def split_profile(profile: CandidateProfile, selected_ids: List[str], length: str) -> Tuple[CandidateProfile, List[WorkExperience]]:
    """Perfil solo con las experiencias elegidas (con viñetas recortadas) y la lista de las demás."""
    max_bullets = LENGTHS[length]["max_bullets"] or 99
    keep = set(selected_ids)
    selected, others = [], []
    for exp in profile.experiences:
        if exp.id in keep:
            selected.append(exp.model_copy(update={"bullet_achievements": exp.bullet_achievements[:max_bullets]}))
        else:
            others.append(exp)
    return profile.model_copy(update={"experiences": selected}), others


def previous_experience_section(others: List[WorkExperience]) -> str:
    if not others:
        return ""
    lines = []
    for exp in others:
        period = _period(exp)
        lines.append(f"- **{exp.role.strip()}** · {exp.company.strip()}" + (f" ({period})" if period else ""))
    return "## Experiencia anterior\n" + "\n".join(lines) + "\n"


def insert_previous_experience(markdown: str, others: List[WorkExperience]) -> str:
    """Quita cualquier 'Experiencia anterior' que haya escrito la IA y agrega la del servidor antes de Educación."""
    md = _PREV_HEADING.sub("", markdown or "").rstrip() + "\n"
    section = previous_experience_section(others)
    if not section:
        return md.strip()
    m = _EDU_HEADING.search(md)
    if m:
        return (md[: m.start()].rstrip() + "\n\n" + section + "\n" + md[m.start():]).strip()
    return (md.rstrip() + "\n\n" + section).strip()
