"""
Coincidencia de palabras clave para cualquier área laboral.

- Ignora tildes y mayúsculas ("Enfermería" == "enfermeria").
- Compara por raíz de palabra ("enfermera" encuentra "enfermería" y "enfermero").
- Expande sinónimos y equivalentes en inglés de oficios y profesiones comunes,
  porque varias fuentes (tableros remotos, LinkedIn global) publican en inglés.
"""

import re
import unicodedata
from typing import Iterable, List, Set

# Palabras que no aportan a la búsqueda.
_STOPWORDS = {
    "de", "del", "la", "las", "el", "los", "en", "y", "o", "para", "con", "a", "al",
    "un", "una", "por", "the", "of", "and", "or", "for", "in", "to", "an",
}

# Raíz normalizada -> términos equivalentes (español e inglés). Mantener en minúsculas sin tildes.
_SYNONYMS = {
    "enferm": ["enfermeria", "enfermero", "enfermera", "tens", "paramedico", "nurse", "nursing"],
    "tens": ["tens", "tecnico en enfermeria", "paramedico", "nurse"],
    "medic": ["medico", "doctor", "physician"],
    "kinesiolog": ["kinesiologo", "physiotherapist", "physical therapist"],
    "psicolog": ["psicologo", "psychologist"],
    "vended": ["vendedor", "ventas", "ejecutivo comercial", "sales", "salesperson", "sales associate"],
    "ventas": ["ventas", "vendedor", "comercial", "sales"],
    "contad": ["contador", "contabilidad", "contable", "accountant", "accounting"],
    "contab": ["contabilidad", "contador", "contable", "accounting", "accountant"],
    "administrativ": ["administrativo", "asistente administrativo", "administrative", "office assistant"],
    "bodega": ["bodega", "bodeguero", "almacen", "logistica", "warehouse"],
    "bodeguer": ["bodeguero", "bodega", "warehouse"],
    "logistic": ["logistica", "bodega", "logistics", "supply chain"],
    "conductor": ["conductor", "chofer", "driver"],
    "chofer": ["chofer", "conductor", "driver"],
    "profesor": ["profesor", "docente", "teacher", "educador"],
    "docente": ["docente", "profesor", "teacher"],
    "educador": ["educadora", "educador", "parvulos", "teacher", "preschool"],
    "parvul": ["parvulos", "parvularia", "educadora", "preschool teacher"],
    "abogad": ["abogado", "juridico", "legal", "lawyer", "attorney"],
    "arquitect": ["arquitecto", "architect"],
    "construc": ["construccion", "constructor", "obra", "construction"],
    "electric": ["electrico", "electricista", "electrician", "electrical"],
    "mecanic": ["mecanico", "mechanic", "mechanical"],
    "cocin": ["cocinero", "cocina", "chef", "cook"],
    "garzon": ["garzon", "mesero", "waiter"],
    "guardia": ["guardia", "seguridad", "security guard"],
    "aseo": ["aseo", "limpieza", "cleaning", "housekeeping"],
    "recepcion": ["recepcionista", "recepcion", "receptionist", "front desk"],
    "cajer": ["cajero", "caja", "cashier"],
    "atencion": ["atencion al cliente", "servicio al cliente", "customer service", "customer support"],
    "diseñ": ["diseñador", "diseño", "designer"],
    "disen": ["disenador", "diseno", "designer"],
    "marketing": ["marketing", "publicidad", "comunicaciones"],
    "recursos": ["recursos humanos", "rrhh", "human resources", "hr"],
    "rrhh": ["rrhh", "recursos humanos", "human resources"],
    "desarroll": ["desarrollador", "developer", "programador", "software engineer"],
    "programad": ["programador", "developer", "desarrollador"],
    "analista": ["analista", "analyst"],
    "jefe": ["jefe", "jefa", "encargado", "supervisor", "manager", "lead", "coordinador"],
    "encargad": ["encargado", "jefe", "supervisor", "manager"],
    "supervisor": ["supervisor", "jefe", "encargado", "manager"],
    "asistente": ["asistente", "assistant", "auxiliar"],
    "tecnico": ["tecnico", "technician"],
    "ingenier": ["ingeniero", "engineer"],
    "soporte": ["soporte", "support", "help desk", "mesa de ayuda"],
    "operari": ["operario", "operador", "operator"],
    "prevencion": ["prevencionista", "prevencion de riesgos", "hse", "safety"],
}


def normalize(text: str) -> str:
    """Minúsculas y sin tildes (conserva la ñ como n)."""
    text = unicodedata.normalize("NFKD", (text or "").lower())
    return "".join(c for c in text if not unicodedata.combining(c))


def tokens(text: str) -> List[str]:
    return [t for t in re.findall(r"[a-z0-9]+", normalize(text)) if t not in _STOPWORDS and len(t) > 1]


def stem(word: str) -> str:
    """Raíz simple: recorta terminaciones de género/número para palabras largas."""
    w = normalize(word)
    if len(w) >= 7:
        return w[:-2] if w.endswith(("as", "os", "es")) else w[:-1]
    if len(w) >= 5 and w.endswith(("a", "o", "s")):
        return w[:-1]
    return w


def _alternatives(token: str) -> List[str]:
    """La palabra y sus equivalentes (cada equivalente puede ser una frase)."""
    alts: List[str] = [token]
    seen: Set[str] = {token}
    st = stem(token)
    for root, syns in _SYNONYMS.items():
        r = normalize(root)
        if token.startswith(r) or (len(st) >= 4 and r.startswith(st)):
            for syn in syns:
                n = normalize(syn)
                if n not in seen:
                    seen.add(n)
                    alts.append(n)
    return alts


def expand_keywords(keywords: str) -> List[str]:
    """
    Lista plana de la consulta y sus equivalentes (útil para depurar o para consultar
    fuentes en inglés). Ej.: "enfermera" -> ["enfermera", "enfermeria", ..., "nurse"].
    """
    base = normalize(keywords).strip()
    if not base:
        return []
    out: List[str] = [base]
    for tok in tokens(base):
        for alt in _alternatives(tok):
            if alt not in out:
                out.append(alt)
    return out


def _phrase_in_tokens(phrase: str, text_tokens: List[str]) -> bool:
    words = tokens(phrase)
    return bool(words) and all(any(t.startswith(stem(w)) for t in text_tokens) for w in words)


def keyword_matches(text: str, keywords: str) -> bool:
    """
    True si el texto corresponde a la búsqueda: CADA palabra significativa de la consulta
    aparece en el texto, ya sea tal cual (por raíz, sin tildes) o mediante un equivalente.
    "analista contable" encuentra "Senior Accounting Analyst" pero no "Analista de Datos".
    Sin palabra clave, todo coincide.
    """
    query_tokens = tokens(keywords or "")
    if not query_tokens:
        return True
    text_tokens = tokens(text)
    return all(
        any(_phrase_in_tokens(alt, text_tokens) for alt in _alternatives(tok))
        for tok in query_tokens
    )
