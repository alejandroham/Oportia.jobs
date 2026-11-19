"""
"Pegar el texto de una oferta": la persona copia una oferta (de Indeed, un correo, WhatsApp, el sitio de
una empresa…) y Oportia la ordena para su uso personal: evaluar compatibilidad, adaptar el CV y guardarla.

- Con IA: una consulta ordena cargo, empresa, lugar, modalidad, renta, cierre y requisitos, sin inventar.
- Sin IA: reglas simples (primera línea como cargo, región y comuna, fecha de cierre).
- Sin estado: el servidor no guarda la oferta; vuelve al navegador de la persona.
"""

import logging
import re
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from app.agents.llm_provider import AIRestingError, AINotConnectedError, LLMProviderError, llm
from app.models.schemas import JobPosting
from app.scrapers.url_parser import sanitize_job_text
from app.utils.chile_regions import detect_region_and_commune

logger = logging.getLogger(__name__)

# Portales cuyas condiciones prohíben que otras apps lean o reproduzcan sus avisos (revisado el 2026-11-16).
# El servidor no descarga sus páginas; la persona puede pegar el texto para su uso personal.
RESTRICTED_PORTALS = {
    "indeed.com": "Indeed",
    "computrabajo.com": "Computrabajo",
    "laborum.cl": "Laborum",
}

PORTAL_NAMES = {
    **RESTRICTED_PORTALS,
    "linkedin.com": "LinkedIn", "getonbrd.com": "GetOnBoard", "empleospublicos.cl": "Empleos Públicos",
    "chiletrabajos.cl": "ChileTrabajos", "bne.cl": "Bolsa Nacional de Empleo",
}

MONTHS = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
          "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}


def portal_of(url: Optional[str]) -> Optional[str]:
    host = (urlparse(url or "").hostname or "").lower()
    for domain, name in PORTAL_NAMES.items():
        if host == domain or host.endswith("." + domain):
            return name
    return None


def restricted_portal(url: Optional[str]) -> Optional[str]:
    host = (urlparse(url or "").hostname or "").lower()
    for domain, name in RESTRICTED_PORTALS.items():
        if host == domain or host.endswith("." + domain):
            return name
    return None


def _find_deadline(text: str) -> Optional[str]:
    """'Postula hasta el 30/11/2026', 'cierre: 30 de noviembre de 2026' -> '2026-11-30'."""
    low = text.lower()
    m = re.search(r"(?:hasta|cierre|cierra|plazo|vence|fecha l[ií]mite)[^\d\n]{0,25}(\d{1,2})[/-](\d{1,2})[/-](\d{4})", low)
    if m:
        return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    m = re.search(r"(?:hasta|cierre|cierra|plazo|vence|fecha l[ií]mite)[^\d\n]{0,25}(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?", low)
    if m and m.group(2) in MONTHS and m.group(3):
        return f"{m.group(3)}-{MONTHS[m.group(2)]:02d}-{int(m.group(1)):02d}"
    return None


def _rule_based(text: str) -> Dict[str, Any]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    title = next((l for l in lines[:5] if 3 < len(l) < 90), "Oferta pegada")
    company = ""
    m = re.search(r"(?im)^(?:empresa|compañ[ií]a|instituci[oó]n|empleador)\s*[:\-–]\s*(.+)$", text)
    if m:
        company = m.group(1).strip()
    elif len(lines) > 1 and len(lines[1]) < 70 and not re.search(r"\d{4}|@|http", lines[1]):
        company = lines[1]
    salary = re.search(r"\$\s?\d{1,3}(?:[.\s]\d{3})+(?:\s*(?:a|-|–)\s*\$?\s?\d{1,3}(?:[.\s]\d{3})+)?", text)
    remote = bool(re.search(r"(?i)\b(remoto|teletrabajo|home office|100% remoto)\b", text))
    hybrid = bool(re.search(r"(?i)\bh[ií]brido\b", text))
    return {
        "title": title, "company": company, "salary_range": salary.group(0) if salary else None,
        "modality": "Remoto" if remote else ("Híbrido" if hybrid else "Presencial"), "is_remote": remote,
        "deadline": _find_deadline(text), "requirements": [],
    }


PROMPT = """
Ordena esta oferta de empleo que una persona pegó para su uso personal. NO inventes datos: si algo no está, déjalo vacío.

TEXTO:
---
{text}
---

RESPONDE SOLO JSON:
{{"cargo": "", "empresa": "", "ubicacion": "", "modalidad": "Presencial|Híbrido|Remoto", "renta": "",
  "tipo_contrato": "", "fecha_cierre": "AAAA-MM-DD o vacío", "requisitos": ["..."], "resumen": "2 a 4 frases"}}
"""


def parse_job_text(text: str, url: Optional[str] = None, use_ai: bool = True) -> "tuple[JobPosting, str, Optional[str]]":
    clean, suspicious = sanitize_job_text(text)
    # El limpiador une las líneas; las reglas necesitan los saltos de línea originales (sin caracteres invisibles).
    data = _rule_based(re.sub(r"[\u200B-\u200D\uFEFF\u00AD\u2060]", "", text))
    method, note = "reglas", None
    if use_ai:
        try:
            r = llm.generate_json(PROMPT.format(text=clean[:12000]),
                                  system_instruction="Extraes datos de ofertas de empleo con exactitud y sin inventar.") or {}
            if isinstance(r, dict) and (r.get("cargo") or "").strip():
                data.update({
                    "title": r["cargo"].strip()[:120],
                    "company": (r.get("empresa") or data["company"] or "").strip()[:120],
                    "location": (r.get("ubicacion") or "").strip()[:120],
                    "modality": r.get("modalidad") if r.get("modalidad") in ("Presencial", "Híbrido", "Remoto") else data["modality"],
                    "salary_range": (r.get("renta") or data["salary_range"] or None),
                    "contract_type": (r.get("tipo_contrato") or None),
                    "deadline": r.get("fecha_cierre") if re.match(r"^\d{4}-\d{2}-\d{2}$", str(r.get("fecha_cierre") or "")) else data["deadline"],
                    "requirements": [str(x)[:120] for x in (r.get("requisitos") or [])][:12],
                    "summary": (r.get("resumen") or "").strip()[:600],
                })
                data["is_remote"] = data["modality"] == "Remoto"
                method = "ia"
        except AIRestingError as e:
            note = e.message
        except AINotConnectedError:
            note = "Ordenada sin IA. Activa la IA para que Oportia lea mejor el cargo, la empresa y los requisitos."
        except LLMProviderError as e:
            logger.info(f"Oferta pegada sin IA ({e.code}).")
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Oferta pegada: la IA falló: {type(e).__name__}")
    if method == "reglas" and note is None:
        note = "Ordenada sin IA. Revisa el cargo y la empresa."

    location = data.get("location") or ""
    reg, comm, loc_remote = detect_region_and_commune(f"{location} {clean[:1500]}")
    portal = portal_of(url)
    description = re.sub(r"[\u200B-\u200D\uFEFF\u00AD\u2060]", "", text).strip() if not suspicious else clean.strip()
    if data.get("summary"):
        description = f"{data['summary']}\n\n{description}"
    if data.get("requirements"):
        description += "\n\nRequisitos:\n" + "\n".join(f"- {r}" for r in data["requirements"])
    job = JobPosting(
        title=data["title"], company=data.get("company") or "Empresa no indicada",
        location=location or comm or reg or "Chile", region=reg, commune=comm,
        is_remote=bool(data.get("is_remote") or loc_remote), modality=data.get("modality") or "Presencial",
        salary_range=data.get("salary_range"), contract_type=data.get("contract_type"),
        deadline=data.get("deadline"), description=description[:8000], url=url or None,
        source="pegada", tags=["Pegada por ti"] + ([portal] if portal else []),
    )
    if suspicious:
        note = ((note + " ") if note else "") + "El texto tenía instrucciones sospechosas para la IA y se neutralizaron."
    return job, method, note
