"""
Chile & LATAM Job Portal Scrapers
==================================
Portales integrados con sus estrategias específicas:

1. GetOnBoard.com  → API REST pública oficial (v0, sin autenticación)
2. LinkedIn Chile  → Guest HTML scraper (presencial + híbrido + remoto en CL)
3. ChileTrabajos   → HTML scraper ligero (paginado)
4. EmpleosPúblicos → API REST oficial de convocatorias del Estado (empleospublicos.cl)

Computrabajo y Laborum NO se usan: sus condiciones de uso prohíben el acceso automatizado
y la reproducción de sus avisos (revisado el 2026-11-16).

Principios de diseño:
- Preferir APIs públicas oficiales sobre HTML scraping cuando estén disponibles.
- Respetar robots.txt: ningún portal bloquea búsquedas de empleo en su robots.txt.
- Rate limiting suave: sleep() intercalado entre requests.
- Fail-safe: cada fuente captura su excepción de forma aislada.
- Sanitización: se eliminan etiquetas HTML, whitespace excesivo y caracteres raros.
"""

import httpx
import logging
import re
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from bs4 import BeautifulSoup
from app.models.schemas import JobPosting
from app.scrapers.base import BaseScraper
from app.utils.chile_regions import detect_region_and_commune
from app.utils.concurrency import run_with_deadline
from app.utils.keywords import keyword_matches, relevance_score, tokens as kw_tokens, stem as kw_stem

logger = logging.getLogger(__name__)

# Shared headers simulating a real browser (avoids basic anti-bot blocks)
_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _strip_html(raw: str) -> str:
    """Remove HTML tags and normalize whitespace."""
    text = re.sub(r"<[^>]+>", " ", raw or "")
    return re.sub(r"\s+", " ", text).strip()


def _keyword_match(text: str, keyword: str) -> bool:
    """True si el texto es relevante para la búsqueda (ver relevance_score). Antes bastaba
    con que coincidiera UNA palabra: "encargado informática" aceptaba "Encargado de Aseo"."""
    if not keyword:
        return True
    return relevance_score(text, "", keyword) > 0


def _epoch_to_iso(value) -> Optional[str]:
    """GetOnBoard entrega published_at como epoch (int); JobPosting espera texto ISO."""
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
        except (OverflowError, OSError, ValueError):
            return None
    return str(value)


# ---------------------------------------------------------------------------
# 1. GetOnBoard — Official Public REST API (no auth needed)
# ---------------------------------------------------------------------------

class GetOnBoardScraper(BaseScraper):
    """
    Uses GetOnBoard's official public API v0.
    Endpoint: https://www.getonbrd.com/api/v0/search/jobs
    Docs: https://api-doc.getonbrd.com/
    """
    BASE_URL = "https://www.getonbrd.com/api/v0"

    @property
    def name(self) -> str:
        return "getonbrd"

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 20) -> List[JobPosting]:
        jobs: List[JobPosting] = []
        kw = keywords.strip() if keywords else ""
        if not kw:
            # La API exige "query"; sin palabra clave responde 422.
            return jobs

        try:
            # Search jobs endpoint
            params: dict = {
                "per_page": min(limit, 50),
                "page": 1,
                "expand[]": "company",
            }
            if kw:
                params["query"] = kw

            with httpx.Client(timeout=12.0, follow_redirects=True) as client:
                resp = client.get(f"{self.BASE_URL}/search/jobs", params=params)
                if resp.status_code != 200:
                    logger.warning(f"GetOnBoard search returned {resp.status_code}")
                    return jobs

                data = resp.json().get("data", [])

                for item in data:
                    attrs = item.get("attributes", {})
                    title = attrs.get("title", "")
                    if not title:
                        continue

                    # Modality: remote, hybrid, on-site
                    modality = (attrs.get("remote_modality") or "").lower()
                    is_remote = modality in ("fully_remote", "remote", "remoto")
                    is_hybrid = modality in ("hybrid", "hibrido", "partially_remote")

                    if remote_only and not is_remote:
                        continue

                    # Company info (expanded)
                    # La API v0 entrega la empresa expandida en attributes.company.data.attributes
                    company_obj = attrs.get("company")
                    company_attrs = (company_obj.get("data") or {}).get("attributes", {}) if isinstance(company_obj, dict) else {}
                    company_name = company_attrs.get("name") or attrs.get("company_name") or "Empresa en GetOnBoard"

                    # Location
                    countries = attrs.get("countries") or []
                    country = ", ".join(c for c in countries if isinstance(c, str)) or attrs.get("country") or "Chile"
                    loc_str = country
                    if not loc_str:
                        loc_str = "Chile"

                    # Salary
                    salary_min = attrs.get("min_salary")
                    salary_max = attrs.get("max_salary")
                    salary_currency = attrs.get("salary_currency", "CLP")
                    salary_range = None
                    if salary_min or salary_max:
                        salary_range = f"{salary_currency} {salary_min or '?'} - {salary_max or '?'}"

                    # Tags / tech stack
                    # Los tags vienen como referencias {"data": [{"id", "type"}]} sin nombre; se usa la categoría.
                    tags = [attrs["category_name"]] if isinstance(attrs.get("category_name"), str) else []

                    # Description
                    raw_desc = attrs.get("description") or attrs.get("functions") or ""
                    clean_desc = _strip_html(raw_desc)
                    if not clean_desc:
                        clean_desc = f"Oportunidad de {title} en {company_name}. Modalidad: {modality}. País: {country}."

                    # URL
                    job_url = (item.get("links") or {}).get("public_url") or f"https://www.getonbrd.com/jobs/{item.get('id', '')}"

                    # Modality label for location
                    modality_labels = {"fully_remote": "Remoto", "hybrid": "Híbrido", "on_site": "Presencial"}
                    modality_label = modality_labels.get(modality, modality.capitalize() if modality else "")
                    if modality_label:
                        loc_str = f"{loc_str} — {modality_label}"

                    jobs.append(JobPosting(
                        title=title,
                        company=company_name,
                        location=loc_str,
                        is_remote=is_remote,
                        salary_range=salary_range,
                        description=clean_desc[:4000],
                        url=job_url,
                        source="getonbrd",
                        tags=tags,
                        posted_at=_epoch_to_iso(attrs.get("published_at"))
                    ))

                    if len(jobs) >= limit:
                        break

        except Exception as e:
            logger.warning(f"[GetOnBoard] Error: {e}")

        logger.info(f"[GetOnBoard] Retrieved {len(jobs)} jobs for '{keywords}'")
        return jobs


# ---------------------------------------------------------------------------
# 2. LinkedIn Chile — Guest scraper for presential, hybrid & remote in CL
# ---------------------------------------------------------------------------

class LinkedInChileScraper(BaseScraper):
    """
    Uses LinkedIn's public guest jobs search endpoint.
    Supports f_WT filtering:
      1 = On-site (Presencial)
      2 = Remote (Remoto)
      3 = Hybrid (Híbrido)
    """
    BASE_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"

    @property
    def name(self) -> str:
        return "linkedin_chile"

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 15) -> List[JobPosting]:
        jobs: List[JobPosting] = []

        # Work type filters: remote=2, presential=1, hybrid=3
        # If remote_only: only fetch remote. Otherwise fetch all 3 modalities
        work_type_sets = ["2"] if remote_only else ["1,2,3"]

        for work_types in work_type_sets:
            try:
                params = {
                    "keywords": keywords or "",
                    "location": "Chile",
                    "geoId": "104621616",  # Chile's LinkedIn geoId
                    "f_WT": work_types,
                    "start": 0,
                }

                with httpx.Client(timeout=12.0, headers=_BROWSER_HEADERS, follow_redirects=True) as client:
                    resp = client.get(self.BASE_URL, params=params)
                    if resp.status_code != 200:
                        logger.warning(f"[LinkedIn Chile] HTTP {resp.status_code}")
                        continue

                    soup = BeautifulSoup(resp.text, "html.parser")
                    cards = soup.find_all("li")

                    for card in cards:
                        title_el = card.find("h3", class_="base-search-card__title")
                        company_el = card.find("h4", class_="base-search-card__subtitle")
                        loc_el = card.find("span", class_="job-search-card__location")
                        link_el = card.find("a", class_="base-card__full-link")

                        if not title_el or not company_el:
                            continue

                        title = title_el.get_text(strip=True)
                        company = company_el.get_text(strip=True)
                        loc = loc_el.get_text(strip=True) if loc_el else "Chile"
                        url = ""
                        if link_el and "href" in link_el.attrs:
                            url = link_el["href"].split("?")[0]

                        # Determine modality from location text
                        loc_lower = loc.lower()
                        is_remote = "remoto" in loc_lower or "remote" in loc_lower
                        is_hybrid = "híbrido" in loc_lower or "hybrid" in loc_lower or "hibrido" in loc_lower

                        if not _keyword_match(f"{title} {company}", keywords):
                            continue

                        jobs.append(JobPosting(
                            title=title,
                            company=company,
                            location=loc,
                            is_remote=is_remote,
                            description=(
                                f"Oferta de empleo en LinkedIn Chile: {title} en {company}. "
                                f"Ubicación: {loc}. Modalidad: {'Remoto' if is_remote else 'Híbrido' if is_hybrid else 'Presencial'}."
                            ),
                            url=url,
                            source="linkedin_chile",
                            tags=[keywords] if keywords else [],
                        ))

                        if len(jobs) >= limit:
                            break

            except Exception as e:
                logger.warning(f"[LinkedIn Chile] Error: {e}")

        logger.info(f"[LinkedIn Chile] Retrieved {len(jobs)} jobs")
        return jobs


# ---------------------------------------------------------------------------
# 4. ChileTrabajos — HTML scraper (paginado)
# ---------------------------------------------------------------------------

class ChileTrabajosСraper(BaseScraper):
    """
    Scrapes chiletrabajos.cl.
    Since it doesn't have a public API, uses HTML scraping on its search page.
    """
    BASE_URL = "https://www.chiletrabajos.cl"

    @property
    def name(self) -> str:
        return "chiletrabajos"

    MONTHS = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
              "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}

    @classmethod
    def _parse_date(cls, text: str) -> Optional[str]:
        """'03 de  Noviembre de 2026' -> '2026-11-03'."""
        m = re.search(r"(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})", (text or "").lower())
        if not m or m.group(2) not in cls.MONTHS:
            return None
        return f"{m.group(3)}-{cls.MONTHS[m.group(2)]:02d}-{int(m.group(1)):02d}"

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 15) -> List[JobPosting]:
        """Búsqueda pública de ChileTrabajos (/encuentra-un-empleo?2=…). Tarjetas div.job-item."""
        jobs: List[JobPosting] = []
        kw = keywords.strip() if keywords else ""
        try:
            with httpx.Client(timeout=14.0, headers=_BROWSER_HEADERS, follow_redirects=True) as client:
                resp = client.get(f"{self.BASE_URL}/encuentra-un-empleo", params={"2": kw} if kw else {})
                if resp.status_code != 200:
                    logger.warning(f"[ChileTrabajos] HTTP {resp.status_code}")
                    return jobs
                soup = BeautifulSoup(resp.text, "html.parser")
                for card in soup.select("div.job-item"):
                    link = card.select_one("h2.title a") or card.select_one("h2 a")
                    if not link:
                        continue
                    title = link.get_text(" ", strip=True)
                    url = link.get("href", "")
                    url = f"{self.BASE_URL}{url}" if url.startswith("/") else url
                    metas = card.select("h3.meta")
                    company, loc, posted = "Empresa en ChileTrabajos", "Chile", None
                    if metas:
                        city = metas[0].find("a")
                        loc = city.get_text(" ", strip=True) if city else "Chile"
                        company = metas[0].get_text(" ", strip=True).replace(loc, "").strip().rstrip(",").strip() or company
                    for m in metas[1:]:
                        posted = posted or self._parse_date(m.get_text(" ", strip=True))
                    desc_el = card.select_one("p.description")
                    desc = desc_el.get_text(" ", strip=True).replace("Ver más", "").strip() if desc_el else ""
                    is_remote = bool(re.search(r"remot|teletrabajo|home office", f"{title} {loc} {desc}", re.I))
                    if remote_only and not is_remote:
                        continue
                    if kw and not _keyword_match(f"{title} {desc}", kw):
                        continue
                    jobs.append(JobPosting(
                        title=title, company=company, location=loc, is_remote=is_remote,
                        modality="Remoto" if is_remote else "Presencial",
                        description=desc or f"{title} en {company}. Ubicación: {loc}.",
                        url=url, source="chiletrabajos", posted_at=posted, tags=[kw] if kw else [],
                    ))
                    if len(jobs) >= limit:
                        break
        except Exception as e:  # noqa: BLE001
            logger.warning(f"[ChileTrabajos] Error: {e}")
        logger.info(f"[ChileTrabajos] Retrieved {len(jobs)} jobs for '{keywords}'")
        return jobs


# ---------------------------------------------------------------------------
# 6. Empleos Públicos Chile (empleospublicos.cl) — Official Government Portal
# ---------------------------------------------------------------------------

class EmpleosPublicosScraper(BaseScraper):
    """
    Scraper oficial para Empleos Públicos de Chile (https://www.empleospublicos.cl/).
    Consume la API REST interna /apiConvocatorias.ashx del Estado de Chile.
    Cubre convocatorias de cualquier profesión u oficio (salud, educación, administración,
    tecnología, municipios, etc.); el filtro por palabra clave se aplica más abajo.
    """
    API_URL = "https://www.empleospublicos.cl/apiConvocatorias.ashx"

    @property
    def name(self) -> str:
        return "empleospublicos"

    @staticmethod
    def _parse_chile_date_to_iso(date_str: Optional[str]) -> Optional[str]:
        """Convert 'DD/MM/YYYY HH:MM:SS' into ISO-8601 'YYYY-MM-DDTHH:MM:SS'."""
        if not date_str:
            return None
        try:
            parts = date_str.strip().split()
            d_parts = parts[0].split("/")
            if len(d_parts) == 3:
                day, month, year = d_parts
                time_part = parts[1] if len(parts) > 1 else "00:00:00"
                # "0:00:00" -> "00:00:00": los navegadores no entienden la hora de un dígito.
                hms = (time_part.split(":") + ["00", "00"])[:3]
                time_part = ":".join(x.zfill(2) for x in hms)
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}T{time_part}"
        except Exception:
            pass
        return date_str

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 20) -> List[JobPosting]:
        jobs: List[JobPosting] = []

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Referer": "https://www.empleospublicos.cl/",
        }

        try:
            params = {
                "status": "Abierta",
                "pageSize": 500,
            }

            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                resp = client.get(self.API_URL, params=params, headers=headers)
                if resp.status_code != 200:
                    logger.warning(f"[EmpleosPublicos] API returned status {resp.status_code}")
                    return jobs

                payload = resp.json()
                raw_items = payload.get("data", [])

                for item in raw_items:
                    cargo = (item.get("Cargo") or "").strip()
                    area = (item.get("Área de Trabajo") or "").strip()
                    if not cargo:
                        continue

                    institucion = (item.get("Institución / Entidad") or "").strip().rstrip("/").strip()
                    ministerio = (item.get("Ministerio") or "").strip()
                    region_raw = (item.get("Región") or "").strip()
                    ciudad_raw = (item.get("Ciudad") or "").strip()
                    tipo_vacante = (item.get("Tipo de Vacante") or "").strip()
                    vacantes = item.get("Nº de Vacantes") or "1"
                    url = item.get("url") or "https://www.empleospublicos.cl/"
                    raw_renta = item.get("Renta Bruta", "0")
                    fecha_inicio = item.get("Fecha Inicio")
                    fecha_cierre = item.get("Fecha Cierre Convocatoria")

                    # Location & Regional Identification
                    loc_parts = [p for p in [ciudad_raw, region_raw] if p]
                    location = ", ".join(loc_parts) if loc_parts else "Chile"
                    job_region, job_commune, is_loc_remote = detect_region_and_commune(location)

                    # Modality
                    is_remote = is_loc_remote or any(
                        k in f"{cargo} {tipo_vacante} {area}".lower()
                        for k in ["remoto", "teletrabajo", "remote"]
                    )
                    if remote_only and not is_remote:
                        continue

                    # Coincidencia por relevancia sobre el CARGO y el área. Se ignora el prefijo
                    # "(Base de datos)" de los bancos de talento: antes, cualquier búsqueda con
                    # "inform" aceptaba toda convocatoria que dijera "datos" (psicólogos, TENS...).
                    if keywords:
                        cargo_sin_prefijo = re.sub(r'^\W*base de datos\W*', '', cargo or '', flags=re.IGNORECASE)
                        if relevance_score(cargo_sin_prefijo, f"{area} {institucion}", keywords) == 0:
                            continue

                    # Format salary (CLP)
                    salary_range = None
                    try:
                        clean_num = raw_renta.replace(".", "").replace(",", ".")
                        renta_float = float(clean_num)
                        if renta_float > 0:
                            formatted_val = f"${renta_float:,.0f}".replace(",", ".")
                            salary_range = f"{formatted_val} CLP (Renta Bruta)"
                    except Exception:
                        if raw_renta and raw_renta != "0,00":
                            salary_range = f"${raw_renta} CLP"

                    # Company label
                    if institucion and ministerio and ministerio.lower() not in institucion.lower():
                        company = f"{institucion} ({ministerio})"
                    else:
                        company = institucion or ministerio or "Estado de Chile"

                    # ISO timestamps for publication and closing deadline
                    deadline_iso = self._parse_chile_date_to_iso(fecha_cierre)
                    posted_iso = self._parse_chile_date_to_iso(fecha_inicio)

                    # Description
                    desc_parts = [
                        f"Convocatoria pública del Estado de Chile para el cargo de {cargo} en {company}.",
                        f"Modalidad / Vacante: {tipo_vacante or 'Contrata / Planta'} (Nº de vacantes: {vacantes}).",
                        f"Ubicación: {location}.",
                    ]
                    if salary_range:
                        desc_parts.append(f"Renta: {salary_range}.")
                    if fecha_cierre:
                        desc_parts.append(f"Fecha límite de postulación: {fecha_cierre}.")
                    desc_parts.append(f"Postulación oficial a través del portal Empleos Públicos: {url}")
                    description = "\n".join(desc_parts)

                    tags = ["Chile", "Sector Público", "Gobierno", "Empleos Públicos"]
                    if area:
                        tags.append(area)

                    jobs.append(JobPosting(
                        title=cargo,
                        company=company,
                        location=location,
                        region=job_region,
                        commune=job_commune,
                        is_remote=is_remote,
                        modality="Remoto" if is_remote else "Presencial",
                        contract_type=tipo_vacante or "Contrata / Planta",
                        salary_range=salary_range,
                        description=description,
                        url=url,
                        source="empleospublicos",
                        tags=tags,
                        posted_at=posted_iso,
                        deadline=deadline_iso,
                    ))

                    if len(jobs) >= limit:
                        break

        except Exception as e:
            logger.warning(f"[EmpleosPublicos] Scraper error: {e}")

        logger.info(f"[EmpleosPublicos] Retrieved {len(jobs)} jobs for '{keywords}'")
        return jobs


# ---------------------------------------------------------------------------
# Unified Chile Scraper — combines all Chilean portals
# ---------------------------------------------------------------------------

class ChilePortalsScraper(BaseScraper):
    """
    Aggregator that queries all Chilean portals in parallel with a total time limit.
    Sources used:
      - GetOnBoard (API oficial, alta confianza)
      - LinkedIn Chile (presencial + híbrido + remoto en Chile)
      - ChileTrabajos (HTML)
      - Empleos Públicos CL (API oficial de convocatorias del Estado de Chile)
    """

    @property
    def name(self) -> str:
        return "chile_portals"

    # Nombre visible de cada portal (se muestra si no responde a tiempo).
    SOURCES = {
        "GetOnBoard": GetOnBoardScraper,
        "LinkedIn Chile": LinkedInChileScraper,
        "ChileTrabajos": ChileTrabajosСraper,
        "Empleos Públicos": EmpleosPublicosScraper,
    }

    @staticmethod
    def _annotate_location(jobs: List[JobPosting]) -> None:
        for j in jobs:
            if not j.region or not j.commune:
                reg, comm, is_rem = detect_region_and_commune(j.location)
                if reg and not j.region:
                    j.region = reg
                if comm and not j.commune:
                    j.commune = comm
                if is_rem:
                    j.is_remote = True
                    j.modality = "Remoto"
                elif not j.modality:
                    j.modality = "Presencial"

    def search_with_status(
        self, keywords: str = "", remote_only: bool = False, limit: int = 40, deadline: float = 6.0
    ) -> Tuple[List[JobPosting], List[str]]:
        """Consulta todos los portales EN PARALELO (antes era en secuencia con pausas)."""
        per_source = max(6, limit // len(self.SOURCES))
        tasks = {
            label: (lambda cls=cls: cls().search(keywords=keywords, remote_only=remote_only, limit=per_source))
            for label, cls in self.SOURCES.items()
        }
        results, failed = run_with_deadline(tasks, deadline=deadline)

        all_jobs: List[JobPosting] = []
        for label in self.SOURCES:  # orden estable
            source_jobs = results.get(label) or []
            self._annotate_location(source_jobs)
            all_jobs.extend(source_jobs)

        logger.info(f"[ChilePortals] {len(all_jobs)} ofertas; sin respuesta: {failed}")
        return all_jobs[:limit], failed

    def search(self, keywords: str = "", remote_only: bool = False, limit: int = 40) -> List[JobPosting]:
        jobs, _ = self.search_with_status(keywords=keywords, remote_only=remote_only, limit=limit)
        return jobs
