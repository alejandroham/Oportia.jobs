"""
Quién es la persona de la consulta actual (solo en memoria, mientras dura la petición).

Cuando una petición trae el perfil del navegador, se anotan aquí su nombre, correo, teléfono y enlaces.
La conexión con la IA (llm_provider) los reemplaza por marcadores antes de enviar cada consulta y los
vuelve a poner en la respuesta. Nada de esto se guarda: la variable desaparece al terminar la petición.
"""

import re
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from app.privacy.redact import EMAIL_TOKEN, LINK_TOKEN, NAME_TOKEN, PHONE_TOKEN, RUT_RE, RUT_TOKEN


@dataclass
class Person:
    name: str = ""
    email: str = ""
    phone: str = ""
    links: List[str] = field(default_factory=list)


current_person: ContextVar[Optional[Person]] = ContextVar("current_person", default=None)


def remember_person(name: Optional[str], email: Optional[str], phone: Optional[str], links: Optional[List[str]] = None) -> None:
    clean = (name or "").strip()
    if not clean or clean.lower() == "candidato" or "{{" in clean:
        return
    current_person.set(Person(clean, (email or "").strip(), (phone or "").strip(), [u for u in (links or []) if u]))


def _name_patterns(name: str) -> List[re.Pattern]:
    parts = [p for p in re.split(r"\s+", name) if p]
    variants = {name}
    if len(parts) >= 3:
        variants.add(f"{parts[0]} {parts[1]}")       # nombre + primer apellido (si no hay segundo nombre)
        variants.add(f"{parts[0]} {parts[-2]}")
        variants.add(f"{parts[0]} {parts[-1]}")
    elif len(parts) == 2:
        variants.add(name)
    out = []
    for v in sorted(variants, key=len, reverse=True):
        if len(v) >= 5:
            out.append(re.compile(r"(?<!\w)" + r"\s+".join(map(re.escape, v.split())) + r"(?!\w)", re.I))
    return out


def _phone_pattern(phone: str) -> Optional[re.Pattern]:
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 8:
        return None
    core = digits[-8:]
    sep = r"[\s.()-]*"
    return re.compile(r"(?:\+?\d{1,3}" + sep + r")?(?:\d" + sep + r")?" + sep.join(core) + r"(?!\d)")


def protect(text: str) -> str:
    """Antes de enviar a la IA: nombre, correo, teléfono y enlaces de la persona -> marcadores; RUT siempre."""
    out = RUT_RE.sub(RUT_TOKEN, text or "")
    person = current_person.get()
    if not person:
        return out
    if person.email:
        out = re.sub(re.escape(person.email), EMAIL_TOKEN, out, flags=re.I)
    pp = _phone_pattern(person.phone) if person.phone else None
    if pp:
        out = pp.sub(PHONE_TOKEN, out)
    for link in person.links:
        out = out.replace(link, LINK_TOKEN)
    for pattern in _name_patterns(person.name):
        out = pattern.sub(NAME_TOKEN, out)
    return out


def restore(text: str) -> str:
    """En la respuesta de la IA: marcadores -> datos reales de la persona (o se quitan si no hay dato)."""
    person = current_person.get()
    out = text or ""
    if person:
        out = out.replace(NAME_TOKEN, person.name).replace(EMAIL_TOKEN, person.email).replace(PHONE_TOKEN, person.phone)
        out = re.sub(r"\{\{\s*nombre\s*\}\}", person.name, out, flags=re.I)
    return out.replace(RUT_TOKEN, "").replace(LINK_TOKEN, "")


def protected_pair(prompt: str, system: Optional[str]) -> Tuple[str, Optional[str]]:
    return protect(prompt), (protect(system) if system else system)
