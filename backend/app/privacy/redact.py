"""
Minimización de datos antes de usar la IA (v1.5.0).

La IA (por ejemplo, el plan gratuito de Google Gemini) NO necesita los datos de contacto para leer un CV,
adaptarlo o preparar una entrevista. Por eso, antes de cada consulta:
- se reemplazan correo, teléfono, RUT y enlaces por marcadores ([CORREO], [TELÉFONO], [RUT], [ENLACE]);
- en el perfil, el nombre se reemplaza por {{NOMBRE}} y se quitan comuna, enlaces y el texto completo del CV;
- después, Oportia vuelve a poner los datos reales con reglas (no con IA), así no se pueden alterar ni inventar.
"""

import json
import re
from typing import Dict, List, Tuple

from app.models.schemas import CandidateProfile

NAME_TOKEN = "{{NOMBRE}}"
EMAIL_TOKEN = "[CORREO]"
PHONE_TOKEN = "[TELÉFONO]"
RUT_TOKEN = "[RUT]"
LINK_TOKEN = "[ENLACE]"

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
URL_RE = re.compile(r"\b(?:https?://|www\.)[^\s<>()\"']+|\b(?:linkedin\.com|github\.com)/[^\s<>()\"']+", re.I)
RUT_RE = re.compile(r"\b\d{1,2}\.?\d{3}\.?\d{3}\s?-\s?[\dkK]\b")
# Chile: celular +56 9 1234 5678 / 9 1234 5678 / fijo +56 2 2345 6789; e internacionales con "+".
PHONE_RE = re.compile(
    r"(?:\+?56[\s.-]?)?\(?(?:0?9|2)\)?[\s.-]?\d{4}[\s.-]?\d{4}\b"
    r"|\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,4}\b"
)


def redact_text(text: str) -> Tuple[str, Dict[str, List[str]]]:
    """Reemplaza correo, enlaces, RUT y teléfono por marcadores. Devuelve (texto, valores encontrados)."""
    found: Dict[str, List[str]] = {"emails": [], "urls": [], "ruts": [], "phones": []}

    def sub(pattern: re.Pattern, token: str, key: str, value: str) -> str:
        def repl(m: re.Match) -> str:
            found[key].append(m.group(0).strip())
            return token
        return pattern.sub(repl, value)

    out = text or ""
    out = sub(EMAIL_RE, EMAIL_TOKEN, "emails", out)  # antes que los enlaces (un correo no es una URL)
    out = sub(URL_RE, LINK_TOKEN, "urls", out)
    out = sub(RUT_RE, RUT_TOKEN, "ruts", out)
    out = sub(PHONE_RE, PHONE_TOKEN, "phones", out)
    for k in found:
        found[k] = list(dict.fromkeys(found[k]))
    return out, found


def profile_for_ai(profile: CandidateProfile) -> CandidateProfile:
    """Copia del perfil sin datos de contacto: lo que sí ve la IA."""
    region = profile.region or ""
    safe = profile.model_copy(update={
        "name": NAME_TOKEN, "email": None, "phone": None,
        "linkedin_url": None, "github_url": None, "portfolio_url": None, "links": [],
        "commune": None, "location": region or "Chile", "raw_cv_text": None,
    })
    # Por si algún texto libre (resumen, funciones, logros) trae un correo o teléfono escrito a mano.
    clean_json, _ = redact_text(json.dumps(safe.model_dump(), ensure_ascii=False))
    data = json.loads(clean_json)
    real_name = (profile.name or "").strip()
    if real_name and len(real_name) > 3:
        data = json.loads(json.dumps(data, ensure_ascii=False).replace(real_name, NAME_TOKEN))
    return CandidateProfile(**data)


def profile_json_for_ai(profile: CandidateProfile) -> str:
    return json.dumps(profile_for_ai(profile).model_dump(), ensure_ascii=False, indent=2)


def contact_line(profile: CandidateProfile) -> str:
    """Línea de contacto exacta del perfil (la escribe Oportia, no la IA)."""
    place = ", ".join([p for p in [profile.commune, profile.region] if p]) or (profile.location if profile.location not in (None, "", "Chile") else "")
    links = [link.url for link in (profile.links or []) if getattr(link, "url", "")] or [u for u in [profile.linkedin_url, profile.portfolio_url, profile.github_url] if u]
    parts = [p for p in [profile.email, profile.phone, place] if p] + [re.sub(r"^https?://(www\.)?", "", u).rstrip("/") for u in links[:3]]
    return " · ".join(parts)


def restore_tokens(text: str, profile: CandidateProfile) -> str:
    """Pone los datos reales donde la IA dejó marcadores; si un dato no existe, quita el marcador."""
    out = (text or "").replace(NAME_TOKEN, (profile.name or "").strip() or "")
    out = out.replace(EMAIL_TOKEN, profile.email or "").replace(PHONE_TOKEN, profile.phone or "")
    out = out.replace(RUT_TOKEN, "").replace(LINK_TOKEN, "")
    # Restos que la IA pudo escribir con otro formato: {{ NOMBRE }}, [Correo], etc.
    out = re.sub(r"\{\{\s*nombre\s*\}\}", (profile.name or "").strip(), out, flags=re.I)
    out = re.sub(r"\[(correo|tel[eé]fono|rut|enlace)\]", "", out, flags=re.I)
    return re.sub(r"[ \t]*[·|][ \t]*(?=[·|\n]|$)", "", out)


def apply_cv_header(markdown: str, profile: CandidateProfile) -> str:
    """Reemplaza el encabezado que escribió la IA (todo antes de la primera sección ##) por el de Oportia."""
    md = restore_tokens(markdown, profile)
    m = re.search(r"^##\s", md, flags=re.M)
    body = md[m.start():] if m else md
    if not m:
        body = re.sub(r"^#\s.*\n?", "", body, count=1)
    title = profile.headline or profile.primary_profession or ""
    header = f"# {(profile.name or '').strip() or 'Tu nombre'}\n"
    line = " · ".join([p for p in [f"**{title}**" if title else "", contact_line(profile)] if p])
    if line:
        header += line + "\n"
    return (header + "\n" + body.lstrip()).strip()
