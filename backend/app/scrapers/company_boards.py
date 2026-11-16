"""
Ofertas DIRECTAS de empresas con oficinas en Chile, desde las API públicas de sus portales de empleo
(Greenhouse, Lever, Ashby y SmartRecruiters). Estas API existen para que las ofertas se difundan.

Solo se guardan las ofertas ubicadas en Chile o remotas para Latinoamérica.
Para sumar una empresa: agregarla a COMPANY_BOARDS después de verificar que su API responde
(ver docs/INDICE_DIARIO.md).
"""

import html
import logging
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional

import requests

from app.models.schemas import JobPosting

logger = logging.getLogger(__name__)

# (portal, identificador en el portal, nombre visible). Verificadas el 2026-11-16.
COMPANY_BOARDS: List[Dict[str, str]] = [
    {"ats": "smartrecruiters", "token": "Accor", "name": "Accor"},
    {"ats": "smartrecruiters", "token": "BoschGroup", "name": "Bosch"},
    {"ats": "smartrecruiters", "token": "DeliveryHero", "name": "PedidosYa (Delivery Hero)"},
    {"ats": "smartrecruiters", "token": "Experian", "name": "Experian"},
    {"ats": "smartrecruiters", "token": "acidlabs", "name": "Acid Labs"},
    {"ats": "greenhouse", "token": "btgpactualchile", "name": "BTG Pactual Chile"},
    {"ats": "greenhouse", "token": "cabify", "name": "Cabify"},
    {"ats": "greenhouse", "token": "clara", "name": "Clara"},
    {"ats": "lever", "token": "xepelin", "name": "Xepelin"},
    {"ats": "lever", "token": "fintual", "name": "Fintual"},
    {"ats": "ashby", "token": "toku", "name": "Toku"},
]

CHILE = re.compile(r"\bchile\b|santiago|valpara[ií]so|concepci[oó]n|antofagasta|vi[nñ]a del mar|temuco|"
                   r"puerto montt|la serena|rancagua|talca|iquique|calama|las condes|providencia", re.I)
LATAM_REMOTE = re.compile(r"latam|latin america|am[eé]rica latina|south america|sudam[eé]rica", re.I)
HEADERS = {"User-Agent": "OportiaJobsIA/1.3 (indice diario de ofertas; +https://oportia-jobs.vercel.app)"}
DESCRIPTION_CHARS = 1500


def _plain(raw: str) -> str:
    text = html.unescape(raw or "")
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()[:DESCRIPTION_CHARS]


def _in_scope(location: str) -> bool:
    """En Chile, o para Latinoamérica (normalmente remota)."""
    return bool(CHILE.search(location or "") or LATAM_REMOTE.search(location or ""))


def _iso_from_ms(ms) -> Optional[str]:
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc).isoformat(timespec="seconds")
    except (TypeError, ValueError):
        return None


def _job(board: Dict[str, str], title: str, url: str, location: str, description: str, *,
         remote: bool = False, posted_at: Optional[str] = None, contract: Optional[str] = None) -> JobPosting:
    is_remote = remote or bool(re.search(r"remot|remote", location or "", re.I))
    return JobPosting(
        title=title.strip(),
        company=board["name"],
        location=location or "Chile",
        is_remote=is_remote,
        modality="Remoto" if is_remote else "Presencial",
        description=description or f"{title} en {board['name']}.",
        url=url,
        source=board["ats"],
        tags=["Portal de la empresa", board["name"]],
        posted_at=posted_at,
        contract_type=contract,
    )


def _greenhouse(board: Dict[str, str]) -> List[JobPosting]:
    r = requests.get(f"https://boards-api.greenhouse.io/v1/boards/{board['token']}/jobs", params={"content": "true"},
                     headers=HEADERS, timeout=20)
    r.raise_for_status()
    out = []
    for j in r.json().get("jobs", []):
        loc = (j.get("location") or {}).get("name", "")
        if _in_scope(loc):
            out.append(_job(board, j.get("title", ""), j.get("absolute_url"), loc, _plain(j.get("content", "")),
                            posted_at=j.get("first_published") or j.get("updated_at")))
    return out


def _lever(board: Dict[str, str]) -> List[JobPosting]:
    r = requests.get(f"https://api.lever.co/v0/postings/{board['token']}", params={"mode": "json"}, headers=HEADERS, timeout=20)
    r.raise_for_status()
    out = []
    for j in r.json():
        cat = j.get("categories") or {}
        loc = " / ".join([cat.get("location") or ""] + [x for x in (cat.get("allLocations") or []) if x != cat.get("location")]).strip(" /")
        if _in_scope(loc):
            out.append(_job(board, j.get("text", ""), j.get("hostedUrl"), loc, _plain(j.get("descriptionPlain") or j.get("description", "")),
                            remote=(j.get("workplaceType") == "remote"), posted_at=_iso_from_ms(j.get("createdAt")),
                            contract=cat.get("commitment")))
    return out


def _ashby(board: Dict[str, str]) -> List[JobPosting]:
    r = requests.get(f"https://api.ashbyhq.com/posting-api/job-board/{board['token']}", headers=HEADERS, timeout=20)
    r.raise_for_status()
    out = []
    for j in r.json().get("jobs", []):
        locs = [j.get("location") or ""] + [s.get("location", "") for s in (j.get("secondaryLocations") or []) if isinstance(s, dict)]
        loc = " / ".join(x for x in locs if x)
        if _in_scope(loc):
            out.append(_job(board, j.get("title", ""), j.get("jobUrl"), loc, _plain(j.get("descriptionPlain") or j.get("descriptionHtml", "")),
                            remote=bool(j.get("isRemote")), posted_at=j.get("publishedAt"), contract=j.get("employmentType")))
    return out


def _smartrecruiters(board: Dict[str, str]) -> List[JobPosting]:
    out, offset = [], 0
    while offset < 500:
        r = requests.get(f"https://api.smartrecruiters.com/v1/companies/{board['token']}/postings",
                         params={"country": "cl", "limit": 100, "offset": offset}, headers=HEADERS, timeout=20)
        r.raise_for_status()
        data = r.json()
        for j in data.get("content", []):
            loc_obj = j.get("location") or {}
            loc = ", ".join(x for x in [loc_obj.get("city"), loc_obj.get("region"), "Chile"] if x)
            dept = " · ".join(x for x in [(j.get("department") or {}).get("label"), (j.get("function") or {}).get("label"),
                                          (j.get("typeOfEmployment") or {}).get("label")] if x)
            out.append(_job(board, j.get("name", ""), f"https://jobs.smartrecruiters.com/{board['token']}/{j.get('id')}", loc,
                            f"{j.get('name', '')} en {board['name']}. {dept}".strip(), remote=bool(loc_obj.get("remote")),
                            posted_at=j.get("releasedDate"), contract=(j.get("typeOfEmployment") or {}).get("label")))
        offset += 100
        if offset >= int(data.get("totalFound") or 0):
            break
    return out


FETCHERS = {"greenhouse": _greenhouse, "lever": _lever, "ashby": _ashby, "smartrecruiters": _smartrecruiters}


def fetch_company_boards(boards: Optional[List[Dict[str, str]]] = None) -> Dict[str, List[JobPosting]]:
    """Ofertas por empresa. Una empresa que falla no detiene las demás."""
    results: Dict[str, List[JobPosting]] = {}
    for board in boards or COMPANY_BOARDS:
        try:
            results[board["name"]] = FETCHERS[board["ats"]](board)
        except Exception as e:  # noqa: BLE001
            logger.warning(f"[Portal de empresa] {board['name']} ({board['ats']}): {e}")
            results[board["name"]] = []
    return results
