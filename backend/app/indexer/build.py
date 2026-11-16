"""
Arma el índice diario de ofertas de Chile (todas las áreas) y lo publica en Supabase Storage.

Lo corre GitHub Actions cada mañana (ver .github/workflows/daily-index.yml):

    cd backend && python -m app.indexer.build            # arma y publica
    cd backend && python -m app.indexer.build --no-upload --out /tmp/index.json.gz

Fuentes: Empleos Públicos y GetOnBoard (API oficiales) y Computrabajo y ChileTrabajos (lectura
moderada: una ronda al día con pausas). LinkedIn NO se usa: sus condiciones prohíben la
recolección automática.
"""

import argparse
import hashlib
import logging
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Callable, Dict, Iterable, List, Optional, Tuple

from app.models.schemas import JobPosting
from app.scrapers.chile_portals import (
    ChilePortalsScraper,
    ChileTrabajosСraper,
    CompuTrabajoCLScraper,
    EmpleosPublicosScraper,
    GetOnBoardScraper,
)
from app.utils.keywords import keyword_matches, normalize

logger = logging.getLogger("oportia.indexer")

INDEX_VERSION = 1
MAX_AGE_DAYS = 30
DESCRIPTION_CHARS = 500

# Por área: consultas para recolectar y palabras para clasificar (el cargo pesa el doble).
AREAS: Dict[str, Dict[str, List[str]]] = {
    "Salud": {
        "queries": ["TENS", "enfermera", "técnico en enfermería", "auxiliar de farmacia", "kinesiólogo", "matrona",
                    "químico farmacéutico", "tecnólogo médico", "nutricionista", "psicólogo"],
        "terms": ["tens", "enfermer", "salud", "clinic", "hospital", "cesfam", "farmac", "kinesiolog", "matron",
                  "medic", "tecnologo medico", "nutricionista", "psicolog", "odontolog", "paramedic", "fonoaudiolog"],
    },
    "Educación": {
        "queries": ["profesor", "educadora de párvulos", "asistente de la educación", "educador diferencial",
                    "psicopedagogo", "inspector"],
        "terms": ["profesor", "docente", "educador", "educadora", "parvul", "colegio", "escuela", "liceo",
                  "psicopedagog", "jardin infantil", "asistente de la educacion", "inspector"],
    },
    "Tecnología": {
        "queries": ["soporte TI", "desarrollador", "analista de sistemas", "encargado de informática",
                    "ingeniero de software", "técnico en redes", "analista de datos"],
        "terms": ["desarrollador", "developer", "software", "soporte ti", "informatic", "sistemas", "redes",
                  "programador", "devops", "data", "datos", "ciberseguridad", "frontend", "backend", "cloud"],
    },
    "Comercio y ventas": {
        "queries": ["vendedor", "cajero", "reponedor", "ejecutivo comercial", "ejecutivo de ventas",
                    "jefe de tienda"],
        "terms": ["vendedor", "ventas", "cajer", "reponedor", "tienda", "comercial", "retail", "promotor",
                  "ejecutivo de cuentas"],
    },
    "Atención al cliente": {
        "queries": ["atención al cliente", "ejecutivo de call center", "recepcionista"],
        "terms": ["atencion al cliente", "call center", "contact center", "recepcionista", "servicio al cliente"],
    },
    "Administración y finanzas": {
        "queries": ["asistente administrativo", "contador", "analista contable", "secretaria",
                    "analista de remuneraciones", "administrativo"],
        "terms": ["administrativ", "contador", "contable", "contabilidad", "finanzas", "secretari",
                  "remuneraciones", "tesorer", "auditor", "cobranza", "facturacion"],
    },
    "Recursos humanos": {
        "queries": ["analista de recursos humanos", "reclutador"],
        "terms": ["recursos humanos", "rrhh", "reclut", "personas", "seleccion"],
    },
    "Logística y transporte": {
        "queries": ["bodeguero", "operario de bodega", "conductor", "chofer", "jefe de bodega", "despachador",
                    "operador de grúa horquilla"],
        "terms": ["bodeg", "logistic", "conductor", "chofer", "despach", "transporte", "grua horquilla",
                  "inventario", "peoneta", "abastecimiento"],
    },
    "Construcción y oficios": {
        "queries": ["maestro de construcción", "electricista", "técnico en mantención", "soldador", "gasfíter",
                    "jornal", "prevencionista de riesgos"],
        "terms": ["construccion", "obra", "maestro", "electric", "mantencion", "mantenimiento", "soldador",
                  "gasfiter", "jornal", "carpinter", "prevencion de riesgos", "prevencionista", "mecanic"],
    },
    "Ingeniería e industria": {
        "queries": ["ingeniero civil", "ingeniero industrial", "operario de producción", "supervisor de planta"],
        "terms": ["ingenier", "industrial", "produccion", "planta", "operari", "calidad", "procesos"],
    },
    "Minería y energía": {
        "queries": ["minería", "operador de equipos mineros"],
        "terms": ["miner", "faena", "energia", "electrica"],
    },
    "Gastronomía y turismo": {
        "queries": ["cocinero", "garzón", "ayudante de cocina", "barista", "mucama"],
        "terms": ["cocin", "garzon", "chef", "gastronom", "barista", "restaurant", "hotel", "turismo",
                  "mucama", "pasteler", "panader"],
    },
    "Seguridad": {
        "queries": ["guardia de seguridad", "vigilante"],
        "terms": ["guardia", "seguridad", "vigilante", "os10"],
    },
    "Aseo y servicios": {
        "queries": ["auxiliar de aseo", "conserje", "jardinero"],
        "terms": ["aseo", "limpieza", "conserje", "auxiliar de servicio", "jardiner", "mayordomo"],
    },
    "Social y sector público": {
        "queries": ["trabajador social", "asistente social", "abogado"],
        "terms": ["trabajador social", "asistente social", "social", "municipal", "abogad", "juridic",
                  "fiscaliz"],
    },
    "Marketing y diseño": {
        "queries": ["diseñador gráfico", "community manager", "marketing"],
        "terms": ["disen", "marketing", "community manager", "publicidad", "comunicaciones", "periodist"],
    },
}

# Fuentes por consulta (Empleos Públicos se lee una sola vez, completo).
QUERY_SOURCES: Dict[str, Callable[[], object]] = {
    "GetOnBoard": GetOnBoardScraper,
    "Computrabajo": CompuTrabajoCLScraper,
    "ChileTrabajos": ChileTrabajosСraper,
    # Laborum queda fuera: su sitio carga las ofertas con JavaScript (pendiente para la Etapa E).
}


def all_queries() -> List[str]:
    seen, out = set(), []
    for cfg in AREAS.values():
        for q in cfg["queries"]:
            if normalize(q) not in seen:
                seen.add(normalize(q))
                out.append(q)
    return out


def classify_area(title: str, text: str = "") -> Optional[str]:
    """Área por diccionario, sin IA. El cargo pesa el doble que la descripción."""
    t, d = normalize(title), normalize(text)
    best, best_score = None, 0
    for area, cfg in AREAS.items():
        score = 0
        for term in cfg["terms"]:
            nt = normalize(term)
            if nt in t:
                score += 2
            elif nt in d:
                score += 1
        if score > best_score:
            best, best_score = area, score
    return best


def stable_id(job: JobPosting) -> str:
    # La consulta (?i=144634) identifica la oferta en varios portales; solo se quitan parámetros de rastreo.
    url = re.sub(r"[?&](utm_[a-z]+|ref|source|trk)=[^&#]*", "", (job.url or "").split("#")[0]).strip().lower().rstrip("/?&")
    # Una URL sin ruta (p. ej. la portada del portal) no identifica la oferta.
    has_path = bool(re.match(r"https?://[^/]+/.+", url))
    key = url if has_path else f"{job.title}|{job.company}|{job.location}"
    return "ix-" + hashlib.sha1(normalize(key).encode("utf-8")).hexdigest()[:16]


def _dedupe_key(job: JobPosting) -> str:
    city = job.commune or job.location or ""
    return f"{normalize(job.title)}|{normalize(job.company)}|{normalize(city)}"


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", str(value))
    if not m:
        return None
    try:
        return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)), tzinfo=timezone.utc)
    except ValueError:
        return None


def is_current(job: JobPosting, now: datetime) -> bool:
    deadline = _parse_date(job.deadline)
    if deadline:
        # Con fecha de cierre manda el cierre (una convocatoria abierta hace 40 días sigue vigente).
        return deadline.date() >= now.date()
    posted = _parse_date(job.posted_at)
    if posted and posted < now - timedelta(days=MAX_AGE_DAYS):
        return False
    return True


def compact(job: JobPosting, first_seen: str) -> Dict[str, object]:
    record = {
        "id": stable_id(job),
        "title": job.title.strip(),
        "company": (job.company or "").strip(),
        "location": job.location,
        "region": job.region,
        "commune": job.commune,
        "modality": job.modality,
        "is_remote": job.is_remote,
        "salary_range": job.salary_range,
        "contract_type": job.contract_type,
        "url": job.url,
        "source": job.source,
        "tags": (job.tags or [])[:6],
        "posted_at": job.posted_at,
        "deadline": job.deadline,
        "description": re.sub(r"\s+", " ", job.description or "").strip()[:DESCRIPTION_CHARS],
        "profession_category": job.profession_category or classify_area(job.title, f"{' '.join(job.tags or [])} {job.description or ''}"),
        "discovered_at": first_seen,
    }
    return {k: v for k, v in record.items() if v not in (None, "", [])}


def merge_jobs(raw: Iterable[JobPosting], previous: Optional[Dict] = None, now: Optional[datetime] = None) -> List[Dict[str, object]]:
    """Limpia, quita duplicados (URL y cargo+empresa+ciudad), descarta vencidas y conserva la fecha en que se vio por primera vez."""
    now = now or datetime.now(timezone.utc)
    first_seen_by_id = {j.get("id"): j.get("discovered_at") for j in (previous or {}).get("jobs", []) if j.get("id")}
    today = now.strftime("%Y-%m-%d")
    seen_ids, seen_keys, out = set(), set(), []
    for job in raw:
        if not job.title or not is_current(job, now):
            continue
        jid, key = stable_id(job), _dedupe_key(job)
        if jid in seen_ids or key in seen_keys:
            continue
        seen_ids.add(jid)
        seen_keys.add(key)
        ChilePortalsScraper._annotate_location([job])
        out.append(compact(job, first_seen_by_id.get(jid) or today))
    return out


def collect(queries: List[str], per_source: int = 25, pause: float = 1.0, workers: int = 4) -> Tuple[List[JobPosting], Dict[str, int]]:
    """Recolecta de todas las fuentes. Una ronda al día, con pausas entre consultas a un mismo portal."""
    jobs: List[JobPosting] = []
    counts: Dict[str, int] = {}

    def run_source(label: str, factory) -> List[JobPosting]:
        found: List[JobPosting] = []
        for q in queries:
            try:
                found.extend(factory().search(keywords=q, remote_only=False, limit=per_source))
            except Exception as e:  # noqa: BLE001 - un portal caído no detiene el índice
                logger.warning(f"[{label}] '{q}': {e}")
            time.sleep(pause)
        return found

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {label: pool.submit(run_source, label, f) for label, f in QUERY_SOURCES.items()}
        try:
            public = EmpleosPublicosScraper().search(keywords="", remote_only=False, limit=5000)
        except Exception as e:  # noqa: BLE001
            logger.warning(f"[Empleos Públicos] {e}")
            public = []
        counts["Empleos Públicos"] = len(public)
        jobs.extend(public)
        for label, fut in futures.items():
            found = fut.result()
            counts[label] = len(found)
            jobs.extend(found)
    return jobs, counts


def build_index(raw: List[JobPosting], source_counts: Dict[str, int], previous: Optional[Dict] = None, now: Optional[datetime] = None) -> Dict[str, object]:
    now = now or datetime.now(timezone.utc)
    jobs = merge_jobs(raw, previous, now)
    areas: Dict[str, int] = {}
    for j in jobs:
        a = str(j.get("profession_category") or "Otras")
        areas[a] = areas.get(a, 0) + 1
    today = now.strftime("%Y-%m-%d")
    return {
        "version": INDEX_VERSION,
        "generated_at": now.isoformat(timespec="seconds"),
        "count": len(jobs),
        "new_today": sum(1 for j in jobs if j.get("discovered_at") == today),
        "sources": source_counts,
        "areas": dict(sorted(areas.items(), key=lambda x: -x[1])),
        "jobs": jobs,
    }


def main(argv: Optional[List[str]] = None) -> int:
    from app.indexer.store import download_index, encode_index, upload_index

    parser = argparse.ArgumentParser(description="Arma el índice diario de ofertas de Oportia.")
    parser.add_argument("--out", help="Guardar también el índice comprimido en este archivo.")
    parser.add_argument("--no-upload", action="store_true", help="No publicar en Supabase Storage.")
    parser.add_argument("--max-queries", type=int, default=0, help="Limitar consultas (para pruebas).")
    parser.add_argument("--per-source", type=int, default=25)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    queries = all_queries()
    if args.max_queries:
        queries = queries[: args.max_queries]
    started = time.time()
    previous = download_index()
    raw, counts = collect(queries, per_source=args.per_source)
    index = build_index(raw, counts, previous)
    logger.info(
        f"Índice: {index['count']} ofertas ({index['new_today']} nuevas hoy) de {len(raw)} recolectadas "
        f"en {time.time() - started:.0f}s. Fuentes: {counts}. Áreas: {index['areas']}"
    )
    if args.out:
        with open(args.out, "wb") as f:
            f.write(encode_index(index))
    if not args.no_upload:
        upload_index(index)
        logger.info("Índice publicado en Supabase Storage.")
    return 0 if index["count"] else 1


if __name__ == "__main__":
    sys.exit(main())
