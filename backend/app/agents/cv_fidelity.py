"""
Fidelidad del CV adaptado: nada que no esté en el perfil de la persona.

Después de que la IA escribe el CV, Oportia lo compara con el perfil REAL (incluido el texto del CV original):
- Experiencias (###) cuya empresa o cargo no está en el perfil -> se quitan.
- Cifras (porcentajes, montos, cantidades, años) que no aparecen en el perfil -> se quita la viñeta o frase.
- Títulos, cursos y competencias sin relación con el perfil -> se quitan.
Devuelve el CV limpio y la lista de lo que se quitó, para avisarle a la persona. Sin IA: solo reglas.
"""

import json
import re
from typing import List, Set, Tuple

from app.models.schemas import CandidateProfile
from app.utils.keywords import normalize, stem, tokens

NUM_RE = re.compile(r"\d[\d.,]*\d|\d")
EDU_RE = re.compile(r"educaci|formaci|estudio|curso|certific|t[ií]tulo|capacitaci", re.I)
SKILL_RE = re.compile(r"competencia|habilidad|herramienta|conocimiento", re.I)
EXP_RE = re.compile(r"experiencia", re.I)
PREV_RE = re.compile(r"experiencia\s+(anterior|previa|adicional)", re.I)


def _num_key(raw: str) -> str:
    raw = raw.strip(".,")
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", raw):  # 1.400.000 -> 1400000
        raw = raw.replace(".", "")
    raw = re.split(r"[.,]", raw)[0] if re.fullmatch(r"\d+[.,]0+", raw) else raw  # 10.0 -> 10
    return re.sub(r"\D", "", raw)


def _corpus(profile: CandidateProfile) -> Tuple[str, Set[str], Set[str]]:
    data = profile.model_dump()
    text = json.dumps(data, ensure_ascii=False) + " " + (profile.raw_cv_text or "")
    nums = {_num_key(m.group(0)) for m in NUM_RE.finditer(text)}
    years = profile.years_of_experience or 0
    nums |= {str(int(years)), str(round(years))} if years else set()
    # Años de experiencia que se pueden calcular con las fechas del perfil (por ejemplo, "más de 10 años").
    from datetime import date
    this_year = date.today().year
    spans, all_years = [], []
    for exp in profile.experiences:
        ys = [int(y) for y in re.findall(r"(?:19|20)\d{2}", f"{exp.start_date} {exp.end_date or ''}")]
        current = bool(re.search(r"actual|present|hoy", (exp.end_date or "").lower()))
        if ys:
            end = this_year if current else max(ys)
            spans.append(end - min(ys))
            all_years += ys + ([this_year] if current else [])
    if all_years:
        spans.append(max(all_years) - min(all_years))
        nums.add(str(this_year))
    nums |= {str(x) for x in spans if x > 0} | {str(x - 1) for x in spans if x > 1}
    toks = tokens(text)
    stems = {stem(t) for t in toks if len(t) >= 4} | {t for t in toks if len(t) < 4}
    return normalize(text), nums, stems


def _unverified_numbers(line: str, nums: Set[str]) -> List[str]:
    return [m.group(0) for m in NUM_RE.finditer(line) if _num_key(m.group(0)) and _num_key(m.group(0)) not in nums]


def _related(text: str, stems: Set[str]) -> bool:
    """¿Comparte al menos una palabra con el perfil? (las siglas cortas como SAP o BIM deben estar tal cual)."""
    words = [stem(t) if len(t) >= 4 else t for t in tokens(text) if len(t) >= 2]
    return not words or any(w in stems for w in words)


def _experience_matches(heading: str, profile: CandidateProfile) -> bool:
    h = normalize(heading)
    for exp in profile.experiences:
        company = normalize(exp.company or "")
        if len(company) >= 3 and company in h:
            return True
        role_words = [stem(t) for t in tokens(exp.role or "") if len(t) >= 4]
        if role_words and sum(1 for w in role_words if w in {stem(t) for t in tokens(heading)}) >= max(1, len(role_words) // 2):
            return True
    return False


def _short(text: str, n: int = 70) -> str:
    t = re.sub(r"[*_#`]", "", text).strip(" -•")
    return t if len(t) <= n else t[: n - 1].rstrip() + "…"


def verify_cv(markdown: str, profile: CandidateProfile) -> Tuple[str, List[str]]:
    """Devuelve (CV sin datos que no estén en el perfil, avisos de lo que se quitó)."""
    _, nums, stems = _corpus(profile)
    out: List[str] = []
    removed: List[str] = []
    section = ""
    skip_block = False
    for line in (markdown or "").split("\n"):
        stripped = line.strip()
        if stripped.startswith("## "):
            section = stripped[3:]
            skip_block = False
            out.append(line)
            continue
        if not section or PREV_RE.search(section):
            out.append(line)  # encabezado (lo reemplaza Oportia) y "Experiencia anterior" (la escribe Oportia)
            continue
        if stripped.startswith("### "):
            skip_block = EXP_RE.search(section) is not None and not _experience_matches(stripped, profile)
            if skip_block:
                removed.append(f"Experiencia que no está en tu perfil: «{_short(stripped[4:])}»")
                continue
            bad = _unverified_numbers(stripped, nums)
            if bad:
                removed.append(f"Fecha que no está en tu perfil ({', '.join(bad)}) en «{_short(stripped[4:])}»")
                for b in bad:
                    line = line.replace(b, "")
                line = re.sub(r"\(\s*[–-]?\s*\)|\s+[–-]\s*(?=\)|$)", "", line).rstrip()
            out.append(line)
            continue
        if skip_block:
            continue
        if not stripped:
            out.append(line)
            continue
        is_bullet = bool(re.match(r"^[-*•]\s", stripped))
        bad = _unverified_numbers(stripped, nums)
        if bad and is_bullet:
            removed.append(f"Cifra que no está en tu perfil ({', '.join(bad)}): «{_short(stripped)}»")
            continue
        if bad:
            # Párrafo: se quita solo la frase con la cifra, no todo el párrafo.
            sentences = re.split(r"(?<=[.!?])\s+", stripped)
            kept = [x for x in sentences if not _unverified_numbers(x, nums)]
            for x in sentences:
                if x not in kept:
                    removed.append(f"Cifra que no está en tu perfil ({', '.join(_unverified_numbers(x, nums))}): «{_short(x)}»")
            if not kept:
                continue
            line = " ".join(kept)
            stripped = line
        if is_bullet and EDU_RE.search(section) and not _related(stripped, stems):
            removed.append(f"Estudio o curso que no está en tu perfil: «{_short(stripped)}»")
            continue
        if SKILL_RE.search(section):
            items = [i.strip() for i in re.split(r"\s*[·|,;]\s*", re.sub(r"^[-*•]\s*", "", stripped)) if i.strip()]
            if len(items) > 1 or is_bullet:
                keep = [i for i in items if _related(i, stems)]
                for i in items:
                    if i not in keep:
                        removed.append(f"Competencia que no está en tu perfil: «{_short(i, 40)}»")
                if not keep:
                    continue
                line = ("- " if is_bullet and len(items) == 1 else "") + " · ".join(keep)
        out.append(line)
    clean = re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()
    return clean, list(dict.fromkeys(removed))


def verify_letter(text: str, profile: CandidateProfile) -> Tuple[str, List[str]]:
    """Carta: quita las frases con cifras que no están en el perfil."""
    _, nums, _ = _corpus(profile)
    removed: List[str] = []
    paragraphs = []
    for para in (text or "").split("\n"):
        sentences = re.split(r"(?<=[.!?])\s+", para)
        kept = []
        for x in sentences:
            bad = _unverified_numbers(x, nums)
            if bad:
                removed.append(f"Cifra que no está en tu perfil ({', '.join(bad)}) en la carta: «{_short(x)}»")
            else:
                kept.append(x)
        paragraphs.append(" ".join(kept))
    return re.sub(r"\n{3,}", "\n\n", "\n".join(paragraphs)).strip(), removed
