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
    # "TI" solo en frases: suelto chocaría con "para ti" en las descripciones.
    "informat": ["informatica", "informatico", "tecnologias de la informacion", "soporte informatico",
                 "sistemas informaticos", "it support", "soporte ti", "area ti", "jefe ti", "encargado ti",
                 "analista ti", "gestion ti", "mesa de ayuda", "help desk"],
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


# Palabras de cargo que por sí solas no definen el área ("encargado de qué?").
# Cuentan para el puntaje, pero no bastan para que una oferta coincida.
GENERIC_ROLE_WORDS = {
    "encargado", "encargada", "jefe", "jefa", "coordinador", "coordinadora", "analista", "asistente",
    "ejecutivo", "ejecutiva", "tecnico", "tecnica", "ingeniero", "ingeniera", "supervisor", "supervisora",
    "profesional", "operario", "operaria", "auxiliar", "ayudante", "gerente", "director", "directora",
    "especialista", "administrador", "administradora", "senior", "junior", "practicante", "trainee",
    "lider", "responsable", "agente", "oficial",
}


def _token_present(token: str, text_tokens: List[str]) -> bool:
    return any(_phrase_in_tokens(alt, text_tokens) for alt in _alternatives(token))


def relevance_score(title: str, description: str, keywords: str) -> int:
    """
    Puntaje de relevancia 0-100 de una oferta para la búsqueda.
    - Las palabras del ÁREA (no genéricas) deben estar todas, en el cargo o la descripción;
      si falta alguna, el puntaje es 0 y la oferta se descarta.
    - Coincidir en el CARGO vale más que en la descripción.
    - Las palabras genéricas (encargado, jefe, analista...) solo suman puntos.
    Ej.: "encargado informática" -> "Encargado de Informática" (100) > "Ingeniero Informático" (70);
    "Encargado de Aseo" y "Psicólogo" -> 0.
    """
    q = tokens(keywords or "")
    if not q:
        return 100
    title_t = tokens(title)
    all_t = title_t + tokens(description)
    domain = [t for t in q if t not in GENERIC_ROLE_WORDS]
    generic = [t for t in q if t in GENERIC_ROLE_WORDS]

    if domain:
        if not all(_token_present(t, all_t) for t in domain):
            return 0
        in_title = sum(_token_present(t, title_t) for t in domain)
        score = 40 + int(30 * in_title / len(domain))
        if generic:
            score += int(30 * sum(_token_present(t, title_t) for t in generic) / len(generic))
        else:
            score += 30 if in_title == len(domain) else 0
        return min(score, 100)

    # Solo palabras genéricas (p. ej. "analista"): deben estar en el cargo.
    if all(_token_present(t, title_t) for t in generic):
        return 100
    return 40 if all(_token_present(t, all_t) for t in generic) else 0
