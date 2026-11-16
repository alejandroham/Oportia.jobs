"""
Etapa C: correo diario con las ofertas NUEVAS del índice (las que aparecieron hoy).

- Destinatario: secreto de GitHub NOTIFY_EMAIL. Nunca está en el código ni se imprime en los registros.
- Envío: Resend (RESEND_API_KEY). Remitente: NOTIFY_FROM o el de pruebas de Resend
  (onboarding@resend.dev, que solo puede enviar al correo de la cuenta de Resend).
- NOTIFY_KEYWORDS (opcional, separadas por coma): solo ofertas de esas búsquedas.
  Sin palabras clave, se agrupan por área.
- Sin repetir: solo ofertas con discovered_at = hoy, máximo 2 por empresa.
"""

import html
import logging
import os
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import requests

from app.utils.keywords import normalize, relevance_score

logger = logging.getLogger("oportia.notify")

RESEND_URL = "https://api.resend.com/emails"
DEFAULT_FROM = "Oportia <onboarding@resend.dev>"
APP_URL = "https://oportia-jobs.vercel.app/empleos"
MAX_PER_AREA = 8
MAX_PER_COMPANY = 2
MAX_TOTAL = 80
SOURCE_LABELS = {"computrabajo": "Computrabajo", "empleospublicos": "Empleos Públicos", "getonbrd": "GetOnBoard",
                 "chiletrabajos": "ChileTrabajos", "laborum": "Laborum"}


def new_jobs(index: Dict, today: Optional[str] = None) -> List[Dict]:
    today = today or str(index.get("generated_at", ""))[:10] or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return [j for j in index.get("jobs", []) if j.get("discovered_at") == today]


def _limit_companies(jobs: List[Dict], per_company: int = MAX_PER_COMPANY) -> List[Dict]:
    seen: Dict[str, int] = {}
    out = []
    for j in jobs:
        c = normalize(j.get("company") or "") or j.get("id", "")
        if seen.get(c, 0) >= per_company:
            continue
        seen[c] = seen.get(c, 0) + 1
        out.append(j)
    return out


def select_jobs(jobs: List[Dict], keywords: List[str]) -> List[Tuple[str, List[Dict]]]:
    """Secciones (título, ofertas): por palabra clave si las hay; si no, por área."""
    sections: List[Tuple[str, List[Dict]]] = []
    used = set()
    total = 0
    if keywords:
        for kw in keywords:
            scored = [(relevance_score(j.get("title", ""), j.get("description", ""), kw), j) for j in jobs if j["id"] not in used]
            hits = _limit_companies([j for s, j in sorted((x for x in scored if x[0] > 0), key=lambda x: -x[0])])
            hits = hits[: max(0, min(MAX_PER_AREA * 2, MAX_TOTAL - total))]
            if hits:
                sections.append((kw, hits))
                used.update(j["id"] for j in hits)
                total += len(hits)
        return sections
    by_area: Dict[str, List[Dict]] = {}
    for j in jobs:
        by_area.setdefault(j.get("profession_category") or "Otras", []).append(j)
    for area, items in sorted(by_area.items(), key=lambda x: (x[0] == "Otras", -len(x[1]))):
        hits = _limit_companies(items)[: max(0, min(MAX_PER_AREA, MAX_TOTAL - total))]
        if hits:
            sections.append((area, hits))
            total += len(hits)
    return sections


def _job_line_html(j: Dict) -> str:
    e = html.escape
    url = j.get("url") or APP_URL
    meta = " · ".join(x for x in [j.get("company"), j.get("commune") or j.get("location"), j.get("modality"), j.get("salary_range")] if x)
    return (
        f'<li style="margin:0 0 10px">'
        f'<a href="{e(url, quote=True)}" style="color:#0f5c4d;font-weight:600;text-decoration:none">{e(j.get("title", ""))}</a>'
        f'<br><span style="color:#4b5563;font-size:13px">{e(meta)}</span>'
        f'<span style="color:#6b7280;font-size:12px"> · Fuente: {e(SOURCE_LABELS.get(j.get("source", ""), j.get("source", "")))}</span></li>'
    )


def build_email(index: Dict, keywords: Optional[List[str]] = None) -> Optional[Tuple[str, str, str]]:
    """(asunto, html, texto) o None si no hay ofertas nuevas que avisar."""
    keywords = [k.strip() for k in (keywords or []) if k.strip()]
    fresh = new_jobs(index)
    sections = select_jobs(fresh, keywords)
    shown = sum(len(s[1]) for s in sections)
    if not shown:
        return None
    date = str(index.get("generated_at", ""))[:10]
    first_run = len(fresh) == index.get("count") and len(fresh) > 200
    if first_run:
        subject = f"Oportia · primer índice: {len(fresh)} ofertas ({date})"
    else:
        subject = f"Oportia · {len(fresh) if not keywords else shown} ofertas nuevas ({date})"
    intro = (
        "Primer índice: todavía no hay un día anterior para comparar, así que esta es una muestra."
        if first_run else
        f"Hoy aparecieron {len(fresh)} ofertas nuevas en Chile" + (f"; estas calzan con tus búsquedas ({', '.join(keywords)})." if keywords else ".")
    )
    e = html.escape
    parts = [
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#111827">',
        '<h1 style="font-size:20px;color:#0f5c4d;margin:0 0 4px">Oportia · ofertas nuevas de hoy</h1>',
        f'<p style="margin:0 0 16px;color:#374151">{e(intro)} Índice total: {index.get("count", 0)} ofertas.</p>',
    ]
    text = [f"Oportia · ofertas nuevas de hoy ({date})", intro, ""]
    for title, items in sections:
        parts.append(f'<h2 style="font-size:16px;margin:18px 0 8px;color:#111827">{e(title)} ({len(items)})</h2><ul style="padding-left:18px;margin:0">')
        parts.extend(_job_line_html(j) for j in items)
        parts.append("</ul>")
        text.append(f"== {title} ==")
        text.extend(f"- {j.get('title')} · {j.get('company')} · {j.get('url') or APP_URL}" for j in items)
        text.append("")
    parts.append(
        f'<p style="margin:20px 0 0"><a href="{APP_URL}" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">Ver todas en Oportia</a></p>'
        '<p style="color:#6b7280;font-size:12px;margin-top:18px">Recibes este correo porque configuraste el aviso diario de Oportia. '
        "Para dejar de recibirlo, borra el secreto NOTIFY_EMAIL del repositorio.</p></div>"
    )
    text.append(f"Ver todas: {APP_URL}")
    return subject, "".join(parts), "\n".join(text)


def send_daily_email(index: Dict) -> Optional[int]:
    """Envía el correo si están RESEND_API_KEY y NOTIFY_EMAIL. Devuelve cuántas ofertas avisó (None si no corresponde)."""
    api_key = (os.environ.get("RESEND_API_KEY") or "").strip()
    to = (os.environ.get("NOTIFY_EMAIL") or "").strip()
    if not api_key or not to:
        logger.info("Aviso por correo desactivado (faltan RESEND_API_KEY o NOTIFY_EMAIL).")
        return None
    keywords = (os.environ.get("NOTIFY_KEYWORDS") or "").split(",")
    built = build_email(index, keywords)
    if not built:
        logger.info("Sin ofertas nuevas para avisar hoy.")
        return 0
    subject, body_html, body_text = built
    res = requests.post(
        RESEND_URL,
        json={
            "from": (os.environ.get("NOTIFY_FROM") or "").strip() or DEFAULT_FROM,
            "to": [a.strip() for a in to.split(",") if a.strip()],
            "subject": subject,
            "html": body_html,
            "text": body_text,
        },
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=30,
    )
    if res.status_code >= 300:
        # El repositorio es público: se oculta cualquier correo que Resend incluya en el mensaje.
        raise RuntimeError(f"Resend respondió {res.status_code}: {redact_emails(res.text[:300])}")
    return sum(1 for line in body_text.splitlines() if line.startswith("- "))


def redact_emails(text: str) -> str:
    return re.sub(r"[\w.+-]+@[\w-]+(\.[\w-]+)+", "[correo oculto]", text or "")
