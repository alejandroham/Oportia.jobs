"""
Armado del CV adaptado con formato compatible con ATS (v1.6.0).

La IA solo propone REDACCIÓN (perfil profesional, descripción breve y logros de cada cargo, competencias y palabras
clave de la oferta). La ESTRUCTURA y los HECHOS los pone Oportia desde el perfil, con reglas:
- Títulos de sección estándar: Perfil profesional, Competencias, Experiencia laboral, Experiencia anterior,
  Educación, Certificaciones y cursos, Idiomas.
- Cada cargo, una cosa por línea:  "### Cargo — Empresa" / "Mes Año – Mes Año | Ciudad" / descripción (1–2 líneas) /
  3–5 viñetas de logros / "Tecnologías: …" (máximo 10, solo las respaldadas por el perfil).
- El cargo y la empresa se copian tal cual del perfil (nunca se reescriben).
- Educación sin redundancias: "Título – Institución (año)".
"""

import re
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

from app.models.schemas import CandidateProfile, EducationItem, JobPosting, WorkExperience
from app.utils.keywords import normalize, stem, tokens

SECTION_PROFILE = "Perfil profesional"
SECTION_SKILLS = "Competencias"
SECTION_EXPERIENCE = "Experiencia laboral"
SECTION_EDUCATION = "Educación"
SECTION_COURSES = "Certificaciones y cursos"
SECTION_LANGUAGES = "Idiomas"

MAX_TECH = 10
MAX_BULLETS = 5
MIN_BULLETS = 3

MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre",
               "Noviembre", "Diciembre"]
_MONTH_KEYS = {"ene": 1, "jan": 1, "feb": 2, "mar": 3, "abr": 4, "apr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8,
               "aug": 8, "sep": 9, "set": 9, "oct": 10, "nov": 11, "dic": 12, "dec": 12}
CURRENT_RE = re.compile(r"\b(actual|actualidad|presente|present|current|a la fecha|hoy|vigente)\b", re.I)
SOFT_HYPHENS_RE = re.compile("[­‐​]")


def clean_text(text: str) -> str:
    """Quita guiones blandos (U+00AD), guiones tipográficos U+2010 y espacios de ancho cero."""
    return SOFT_HYPHENS_RE.sub(lambda m: "-" if m.group(0) == "‐" else "", text or "")


def _parse_date(text: str) -> Optional[Tuple[int, int]]:
    t = normalize(text or "")
    m = re.search(r"\b(\d{1,2})\s*[/.-]\s*((?:19|20)\d{2})\b", t) or None
    if m:
        month = int(m.group(1))
        return int(m.group(2)), month if 1 <= month <= 12 else 0
    m = re.search(r"\b((?:19|20)\d{2})\s*[/.-]\s*(\d{1,2})\b", t)
    if m:
        month = int(m.group(2))
        return int(m.group(1)), month if 1 <= month <= 12 else 0
    m = re.search(r"\b([a-z]{3})[a-z]*\.?\s*(?:de(?:l)?\s+)?((?:19|20)\d{2})\b", t)
    if m and m.group(1) in _MONTH_KEYS:
        return int(m.group(2)), _MONTH_KEYS[m.group(1)]
    m = re.search(r"\b((?:19|20)\d{2})\b", t)
    if m:
        return int(m.group(1)), 0
    return None


def _fmt(d: Optional[Tuple[int, int]]) -> str:
    if not d:
        return ""
    year, month = d
    return f"{MONTH_NAMES[month - 1]} {year}" if month else str(year)


def split_period(exp: WorkExperience) -> Tuple[str, str]:
    """(inicio, término) como texto, aunque el período completo venga en 'start_date' ('2019 – 2021')."""
    start, end = (exp.start_date or "").strip(), (exp.end_date or "").strip()
    if not end:
        parts = re.split(r"\s+[–-]\s+|\s+a\s+|\s+al\s+", start, maxsplit=1)
        if len(parts) == 2:
            start, end = parts
    return start, end


def format_period(exp: WorkExperience) -> str:
    """'Marzo 2023 – Noviembre 2024', 'Marzo 2023 – Actual' o lo que haya (sin inventar meses)."""
    start, end = split_period(exp)
    s = _fmt(_parse_date(start)) or start
    if CURRENT_RE.search(end or "") or (exp.end_date or "").strip().lower() in ("present", "presente"):
        e = "Actual"
    else:
        e = _fmt(_parse_date(end)) or end
    return " – ".join([x for x in (s, e) if x])


def end_year(exp: WorkExperience) -> Optional[int]:
    start, end = split_period(exp)
    if CURRENT_RE.search(end or "") or (exp.end_date or "").lower() in ("present", "presente"):
        return date.today().year
    d = _parse_date(end) or _parse_date(start)
    return d[0] if d else None


def years_of_experience(profile: CandidateProfile) -> int:
    """Años desde el primer cargo hasta hoy (o hasta el último), calculados con las fechas del perfil."""
    starts, ends = [], []
    for exp in profile.experiences:
        s, _ = split_period(exp)
        d = _parse_date(s)
        if d:
            starts.append(d[0])
        e = end_year(exp)
        if e:
            ends.append(e)
    if starts and ends:
        return max(0, max(ends) - min(starts))
    return int(profile.years_of_experience or 0)


def _place(exp: WorkExperience) -> str:
    if exp.is_remote and not exp.location:
        return "Remoto"
    return (exp.location or "").strip()


def format_education(ed: EducationItem) -> str:
    """'Título – Institución (año)', sin repetir carrera y título ('Ingeniero en Informática en Ingeniería…')."""
    degree, field = (ed.degree or "").strip(), (ed.field_of_study or "").strip()
    nd, nf = normalize(degree), normalize(field)
    if not field or (nf and nf in nd):
        title = degree or field
    elif not degree or (nd and nd in nf):
        title = field
    else:
        stems_d = {stem(t) for t in tokens(degree)}
        overlap = [t for t in tokens(field) if stem(t) in stems_d]
        title = degree if overlap and len(overlap) >= len(tokens(field)) / 2 else f"{degree} en {field}"
    parts = [title]
    if ed.institution:
        parts.append(ed.institution.strip())
    out = " – ".join(p for p in parts if p)
    if ed.graduation_year:
        out += f" ({ed.graduation_year.strip()})"
    return out


def _corpus_terms(profile: CandidateProfile) -> str:
    chunks = [" ".join(profile.technical_skills or []), " ".join(profile.soft_skills or []),
              " ".join(profile.keywords or []), " ".join(profile.certifications or []), profile.raw_cv_text or ""]
    for e in profile.experiences:
        chunks += [e.role, e.description or "", " ".join(e.technologies), " ".join(e.bullet_achievements)]
    for ed in profile.education:
        chunks += [ed.degree, ed.field_of_study, ed.institution]
    return normalize(" ".join(chunks))


def is_backed(term: str, corpus: str) -> bool:
    """¿El término (tecnología, competencia, palabra clave) está en los datos de la persona?"""
    t = normalize(term).strip()
    if not t:
        return False
    if re.search(r"(?<![a-z0-9])" + re.escape(t) + r"(?![a-z0-9])", corpus):
        return True
    words = [stem(w) for w in tokens(term) if len(w) >= 4]
    corpus_stems = {stem(w) for w in re.findall(r"[a-z0-9]+", corpus) if len(w) >= 4}
    return bool(words) and all(w in corpus_stems for w in words)


def technologies_for(exp: WorkExperience, suggested: List[str], profile: CandidateProfile, job: JobPosting) -> List[str]:
    """Hasta 10 tecnologías respaldadas por el perfil, primero las que pide la oferta."""
    corpus = _corpus_terms(profile)
    job_text = normalize(f"{job.title} {job.description or ''}")
    pool: List[str] = []
    for t in list(exp.technologies or []) + list(suggested or []):
        t = clean_text(str(t)).strip(" .,;")
        if t and len(t) <= 40 and is_backed(t, corpus) and normalize(t) not in {normalize(x) for x in pool}:
            pool.append(t)
    pool.sort(key=lambda t: 0 if normalize(t) in job_text else 1)
    return pool[:MAX_TECH]


def _first_sentences(text: str, max_chars: int = 230) -> str:
    text = re.sub(r"\s+", " ", clean_text(text)).strip()
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    stop = cut.rfind(". ")
    return cut[: stop + 1] if stop > max_chars * 0.4 else cut[: cut.rfind(" ")].rstrip(",;:") + "…"


# 1.6.8 (DT-20): dos viñetas son "la misma" si comparten al menos el 60 % de sus palabras (Jaccard de raíces).
# Antes solo se descartaban las idénticas y el CV adaptado repetía logros con otras palabras.
SIMILAR_BULLETS = 0.6


def _word_set(text: str) -> set:
    return {stem(t) for t in tokens(text) if len(t) > 2}


def similar_bullets(a: str, b: str) -> bool:
    wa, wb = _word_set(a), _word_set(b)
    if not wa or not wb:
        return normalize(a) == normalize(b)
    return len(wa & wb) / len(wa | wb) >= SIMILAR_BULLETS


def _strip_bullet(text: str) -> str:
    return re.sub(r"^\s*[-–—•*·▪●]+\s*", "", clean_text(str(text))).strip()


def dedupe_bullets(bullets: List[str], against: Optional[List[str]] = None) -> List[str]:
    """Quita guiones iniciales y las viñetas parecidas entre sí o a `against` (por ejemplo, la descripción)."""
    out: List[str] = []
    for b in bullets:
        b = _strip_bullet(b).rstrip(".").strip()
        if len(b) < 4:
            continue
        if any(similar_bullets(b, x) for x in out + list(against or [])):
            continue
        out.append(b)
    return out


def _bullets_for(exp: WorkExperience, ai_bullets: List[str], description: str = "") -> List[str]:
    desc_sentences = [x for x in re.split(r"(?<=[.;])\s+", _strip_bullet(description)) if x.strip()]
    bullets = dedupe_bullets([str(b) for b in (ai_bullets or []) if str(b).strip()], desc_sentences)
    if len(bullets) < MIN_BULLETS:
        # Sin IA (o con pocas viñetas): se usan los logros reales y, si faltan, las frases de las funciones.
        real = [b for b in exp.bullet_achievements if b.strip()]
        sentences = [x.strip() for x in re.split(r"(?<=[.;])\s+", clean_text(exp.description or "")) if len(x.strip()) > 25]
        bullets = dedupe_bullets(bullets + real + sentences, desc_sentences)
    return bullets[:MAX_BULLETS]


def build_cv_markdown(profile: CandidateProfile, ai: Dict[str, Any], job: JobPosting) -> str:
    """CV (sin encabezado ni 'Experiencia anterior', que se agregan después) con formato ATS."""
    by_id = {str(x.get("id")): x for x in (ai.get("experiencias") or []) if isinstance(x, dict)}
    corpus = _corpus_terms(profile)
    lines: List[str] = []

    summary = clean_text(str(ai.get("perfil") or "")).strip() or _first_sentences(profile.summary or "", 420)
    if summary:
        lines += [f"## {SECTION_PROFILE}", summary, ""]

    skills_src = [str(s) for s in (ai.get("competencias") or [])] or list(profile.technical_skills or []) + list(profile.soft_skills or [])
    skills: List[str] = []
    for s in skills_src:
        s = clean_text(s).strip(" .,;")
        if s and is_backed(s, corpus) and normalize(s) not in {normalize(x) for x in skills}:
            skills.append(s)
    if skills:
        lines += [f"## {SECTION_SKILLS}", " · ".join(skills[:16]), ""]

    if profile.experiences:
        lines.append(f"## {SECTION_EXPERIENCE}")
        for exp in profile.experiences:
            item = by_id.get(str(exp.id), {})
            lines.append(f"### {exp.role.strip()} — {exp.company.strip()}")
            when = " | ".join([x for x in (format_period(exp), _place(exp)) if x])
            if when:
                lines.append(when)
                lines.append("")
            desc = _strip_bullet(str(item.get("descripcion") or "")) or _strip_bullet(_first_sentences(exp.description or ""))
            if desc:
                desc = _first_sentences(desc, 260)
                lines += [desc, ""]
            for b in _bullets_for(exp, item.get("logros") or [], desc):
                lines.append(f"- {b}")
            tech = technologies_for(exp, item.get("tecnologias") or [], profile, job)
            if tech:
                lines += ["", f"Tecnologías: {', '.join(tech)}"]
            lines.append("")

    if profile.education:
        lines.append(f"## {SECTION_EDUCATION}")
        lines += [f"- {format_education(ed)}" for ed in profile.education if (ed.degree or ed.field_of_study)]
        lines.append("")
    if profile.certifications:
        lines.append(f"## {SECTION_COURSES}")
        lines += [f"- {clean_text(c).strip()}" for c in profile.certifications if c.strip()]
        lines.append("")
    if profile.languages:
        lines.append(f"## {SECTION_LANGUAGES}")
        lines.append(" · ".join(f"{lang}: {level}" for lang, level in profile.languages.items()))
        lines.append("")
    return clean_text("\n".join(lines)).strip()


# --- Palabras clave de la oferta -----------------------------------------------------------------------------

_GENERIC = {"empresa", "trabajo", "cargo", "postulantes", "experiencia", "conocimientos", "requisitos", "funciones",
            "buscamos", "importante", "deseable", "excluyente", "equipo", "personas", "chile", "santiago", "region",
            "postular", "ofrecemos", "contrato", "jornada", "sueldo", "renta", "beneficios", "años", "anos"}


def rule_keywords(job: JobPosting, limit: int = 18) -> List[str]:
    """Sin IA: palabras más repetidas de la oferta (sin palabras genéricas), con el cargo primero."""
    words = [w for w in tokens(f"{job.title} {job.title} {job.description or ''}") if len(w) >= 4 and w not in _GENERIC]
    counts: Dict[str, int] = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    ranked = sorted(counts, key=lambda w: -counts[w])
    out = [job.title.strip()] if job.title else []
    for w in ranked:
        if len(out) >= limit:
            break
        if w not in normalize(" ".join(out)):
            out.append(w)
    return out


def keyword_match(keywords: List[str], profile: CandidateProfile) -> Dict[str, Any]:
    """% de palabras clave de la oferta que la persona tiene en su perfil, y las que faltan."""
    corpus = _corpus_terms(profile)
    clean: List[str] = []
    for k in keywords or []:
        k = clean_text(str(k)).strip(" .,;")
        if k and len(k) <= 50 and normalize(k) not in {normalize(x) for x in clean}:
            clean.append(k)
    clean = clean[:20]
    present = [k for k in clean if is_backed(k, corpus)]
    missing = [k for k in clean if k not in present]
    score = round(100 * len(present) / len(clean)) if clean else 0
    return {"score": score, "present": present, "missing": missing}


THIRD_PERSON_RE = re.compile(r"\b(cuenta (además )?con|posee|el candidato|la candidata|el postulante|la postulante|su experiencia|es un profesional|es una profesional)\b", re.I)


def is_third_person(text: str) -> bool:
    return bool(THIRD_PERSON_RE.search(text or ""))


# 1.6.8 (DT-21): contradicciones que Oportia avisa en vez de decidir en silencio. Nunca modifica el CV.
_SUMMARY_YEARS_RE = re.compile(r"(?i)(?:m[aá]s de\s+)?(\d{1,2})\s*\+?\s*a[ñn]os(?:\s+de)?\s+(?:de\s+)?experiencia")
GAP_MONTHS = 6


def _months(d: Optional[Tuple[int, int]], default_month: int) -> Optional[int]:
    if not d:
        return None
    return d[0] * 12 + ((d[1] or default_month) - 1)


def coherence_warnings(profile: CandidateProfile, today: Optional[date] = None) -> List[str]:
    """Avisos para revisar: años del resumen distintos a los de las fechas y vacíos de más de 6 meses."""
    today = today or date.today()
    notes: List[str] = []
    computed = years_of_experience(profile)
    m = _SUMMARY_YEARS_RE.search(profile.summary or "")
    if m and computed and abs(int(m.group(1)) - computed) > 1:
        notes.append(
            f"Tu resumen dice {m.group(1)} años de experiencia; tus fechas suman ~{computed}. "
            "Revisa cuál es correcto en Mi perfil (el CV adaptado usa las fechas)."
        )
    spans = []
    for exp in profile.experiences:
        start, end = split_period(exp)
        s = _months(_parse_date(start), 1)
        e = today.year * 12 + today.month - 1 if CURRENT_RE.search(end or "") else _months(_parse_date(end), 12)
        if s is not None and e is not None and e >= s:
            spans.append((s, e, exp))
    spans.sort(key=lambda x: x[0])
    covered_until = None
    for s, e, exp in spans:
        if covered_until is not None and s - covered_until - 1 > GAP_MONTHS:
            gap = s - covered_until - 1
            notes.append(
                f"Hay {gap} meses sin experiencia antes de «{exp.role.strip()}». Si estudiaste, trabajaste por tu cuenta "
                "o cuidaste a alguien, puedes agregarlo en Mi perfil."
            )
        covered_until = e if covered_until is None else max(covered_until, e)
    return notes
