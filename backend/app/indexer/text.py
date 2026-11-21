"""
1.6.12 (DT-32): limpieza de los textos de las ofertas del índice diario (QA-017, QA-034).
Se aplica al armar el índice y también al leerlo (así el índice ya publicado se ve bien sin esperar al de mañana).
"""
import re
from typing import Optional, Tuple

# Restos de la página de un portal que quedaban pegados al texto ("convpostularavisoTrabajo").
_JUNK = re.compile(r"conv(?:postular)?(?:aviso)?(?=[A-ZÁÉÍÓÚÑ])|convpostularaviso|convFicha", re.UNICODE)

# Palabras que se escriben juntas a propósito (no se separan).
_CAMEL_OK = {
    "javascript", "typescript", "powerpoint", "powerbi", "linkedin", "github", "gitlab", "postgresql", "mysql",
    "wordpress", "highlevel", "onedrive", "sharepoint", "devops", "youtube", "iphone", "macos", "fastapi",
    "nodejs", "nextjs", "mongodb", "dynamodb", "sqlserver", "autocad", "solidworks", "salesforce", "hubspot",
    "getonboard", "chiletrabajos", "empleospublicos", "openai", "chatgpt", "graphql", "firebase", "bigquery",
}
_WORD = re.compile(r"[A-Za-zÁÉÍÓÚÑáéíóúñü]+")
_GLUED = re.compile(r"([a-záéíóúñü]{3,})([A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,})")


def _split_glued(word: str) -> str:
    if word.lower() in _CAMEL_OK:
        return word
    return _GLUED.sub(r"\1 \2", word)


def clean_description(text: Optional[str], limit: Optional[int] = None) -> str:
    """Espacios normales, sin restos del portal, palabras pegadas separadas y corte en el límite de una palabra."""
    t = _JUNK.sub(" ", text or "")
    t = _WORD.sub(lambda m: _split_glued(m.group(0)), t)
    t = re.sub(r"\s+", " ", t).strip()
    if limit and len(t) > limit:
        cut = t[: limit + 1]
        space = cut.rfind(" ")
        t = (cut[:space] if space > limit * 0.6 else t[:limit]).rstrip(" ,;:-–—") + "…"
    return t


_MODALITY_WORDS = {
    "híbrido": "Híbrido", "hibrido": "Híbrido", "hybrid": "Híbrido",
    "remoto": "Remoto", "remote": "Remoto", "remote_local": "Remoto", "fully_remote": "Remoto", "teletrabajo": "Remoto",
    "no_remote": "Presencial", "presencial": "Presencial", "on_site": "Presencial", "onsite": "Presencial",
}


def clean_location_modality(location: Optional[str], modality: Optional[str], is_remote: bool) -> Tuple[str, str, bool]:
    """
    'Chile — Híbrido' → ('Chile', 'Híbrido'); 'Remote — Remote_local' → ('Remoto', 'Remoto');
    'Chile — No_remote' → ('Chile', 'Presencial'). Antes se mostraba "Híbrido • Presencial".
    """
    loc = (location or "").strip()
    mod = modality or ("Remoto" if is_remote else "Presencial")
    parts = [p.strip() for p in re.split(r"\s+[—–-]\s+", loc) if p.strip()]
    if len(parts) >= 2 and parts[-1].lower() in _MODALITY_WORDS:
        mod = _MODALITY_WORDS[parts[-1].lower()]
        parts = parts[:-1]
    if parts and parts[0].lower() in ("remote", "remoto", "remote_local"):
        parts[0] = "Remoto"
    loc = " — ".join(parts) if parts else loc
    remote = mod == "Remoto" or bool(is_remote and mod != "Presencial" and mod != "Híbrido")
    return loc, mod, remote
