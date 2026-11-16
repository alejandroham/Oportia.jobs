"""Búsqueda sobre el índice diario (en memoria del servidor; no guarda la búsqueda)."""

from typing import Any, Dict, List, Optional

from app.models.schemas import JobPosting
from app.utils.keywords import relevance_score

NO_KEYWORD_LIMIT = 60


def index_jobs(index: Dict[str, Any]) -> List[JobPosting]:
    out: List[JobPosting] = []
    for raw in index.get("jobs", []):
        if not isinstance(raw, dict) or not raw.get("title"):
            continue
        data = {"description": "", "company": "", **raw}
        try:
            out.append(JobPosting(**data))
        except Exception:  # noqa: BLE001 - un registro dañado no rompe la búsqueda
            continue
    return out


def search_index(index: Optional[Dict[str, Any]], keywords: str, remote_only: bool = False) -> List[JobPosting]:
    """Ofertas del índice que calzan con la búsqueda, las más relevantes y nuevas primero."""
    if not index:
        return []
    jobs = [j for j in index_jobs(index) if not remote_only or j.is_remote]
    kw = (keywords or "").strip()
    if not kw:
        return sorted(jobs, key=lambda j: j.discovered_at or "", reverse=True)[:NO_KEYWORD_LIMIT]
    # Orden estable: primero las más nuevas y luego por relevancia (la relevancia manda).
    newest_first = sorted(jobs, key=lambda j: j.discovered_at or "", reverse=True)
    scored = [(relevance_score(j.title, j.description or "", kw), j) for j in newest_first]
    return [j for s, j in sorted((x for x in scored if x[0] > 0), key=lambda x: -x[0])]


def search_index_for_profile(index: Optional[Dict[str, Any]], terms: List[str], remote_only: bool = False,
                             limit: int = 120) -> List[JobPosting]:
    """
    "Para ti": ofertas del índice que calzan con tus palabras clave del perfil.
    Más arriba las que calzan con más términos y con el término en el cargo.
    """
    if not index:
        return []
    terms = [t.strip() for t in terms if t and t.strip()][:15]
    if not terms:
        return []
    jobs = [j for j in index_jobs(index) if not remote_only or j.is_remote]
    ranked = []
    for j in jobs:
        scores = [relevance_score(j.title, j.description or "", t) for t in terms]
        hits = [s for s in scores if s > 0]
        if hits:
            ranked.append((len(hits), max(hits), j.discovered_at or "", j))
    ranked.sort(key=lambda x: (x[0], x[1], x[2]), reverse=True)
    return [j for *_, j in ranked[:limit]]
