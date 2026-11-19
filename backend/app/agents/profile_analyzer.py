import os
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
import pypdf
import docx
from app.models.schemas import CandidateProfile, WorkExperience, EducationItem, UserPreferences, ProfileLink
from app.agents.llm_provider import llm
from app.storage.db import db
from app.config import settings
from app.utils.chile_regions import detect_region_and_commune
import logging

logger = logging.getLogger(__name__)

def extract_text_from_file(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    raw_text = ""
    try:
        if ext == ".pdf":
            reader = pypdf.PdfReader(str(file_path))
            for page in reader.pages:
                page_text = page.extract_text() or ""
                raw_text += page_text + "\n"
        elif ext in [".docx", ".doc"]:
            doc = docx.Document(str(file_path))
            for p in doc.paragraphs:
                raw_text += p.text + "\n"
        elif ext in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_text = f.read()
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {type(e).__name__}")

    # Palabras partidas con guion al final de línea (PDF con partición de palabras): "trans-\nformación".
    raw_text = re.sub(r"([a-záéíóúñü])[-\u00ad\u2010]\n([a-záéíóúñü])", r"\1\2", raw_text)
    raw_text = raw_text.replace("\u00ad", "")
    # Normalize fragmented PDFs where words are broken with \n \n
    cleaned = raw_text.replace('\n \n', ' ')
    cleaned = re.sub(r'([a-záéíóú,])\n([a-záéíóú])', r'\1 \2', cleaned)
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    return cleaned.strip()

# Universal Taxonomies for Chilean & Latin American Job Markets
UNIVERSAL_PROFESSION_MAP = [
    {
        "pattern": re.compile(r'\b(t[eé]cnico\s+(?:en\s+|de\s+nivel\s+superior\s+en\s+)?enfermer[ií]a|tens|t[eé]cnico\s+param[eé]dico)\b', re.I),
        "primary": "Técnico en Enfermería (TENS)",
        "equivalents": ["TENS", "Técnico en Enfermería", "Técnico paramédico", "Técnico de apoyo clínico", "Asistente de enfermería"],
        "related": ["Cuidador clínico", "Operador de admisión médica", "Coordinador de toma de muestras"],
        "sectors": ["Salud", "Hospitales y Clínicas", "Centros de Salud Familiar (CESFAM)", "Atención Domiciliaria"]
    },
    {
        "pattern": re.compile(r'\b(enfermer[oa]|licenciad[oa]\s+en\s+enfermer[ií]a)\b', re.I),
        "primary": "Enfermero/a Clínico",
        "equivalents": ["Enfermero/a", "Enfermero/a Clínico", "Enfermero/a de Urgencias", "Coordinador de Enfermería"],
        "related": ["Gestor de casos clínicos", "Auditor de calidad en salud", "Epidemiología"],
        "sectors": ["Salud", "Sector Hospitalario", "Clínicas Privadas", "Salud Ocupacional"]
    },
    {
        "pattern": re.compile(r'\b(m[eé]dic[oa]|cirujan[oa])\b', re.I),
        "primary": "Médico Cirujano",
        "equivalents": ["Médico Cirujano", "Médico General", "Médico de Atención Primaria", "Médico de Turno"],
        "related": ["Director médico", "Investigador clínico", "Auditor médico"],
        "sectors": ["Salud Pública y Privada", "Hospitales", "Centros Médicos"]
    },
    {
        "pattern": re.compile(r'\b(kinesi[oó]log[oa])\b', re.I),
        "primary": "Kinesiólogo/a",
        "equivalents": ["Kinesiólogo/a", "Kinesiólogo/a respiratorio", "Kinesiólogo/a neurorehabilitación", "Fisioterapeuta"],
        "related": ["Ergónomo laboral", "Terapeuta de rehabilitación", "Preparador físico clínico"],
        "sectors": ["Salud", "Rehabilitación", "Deportes", "Mutualidades"]
    },
    {
        "pattern": re.compile(r'\b(psic[oó]log[oa])\b', re.I),
        "primary": "Psicólogo/a",
        "equivalents": ["Psicólogo/a Clínico", "Psicólogo/a Laboral / Organizacional", "Psicólogo/a Educacional", "Psicólogo/a Comunitario"],
        "related": ["Consultor de Recursos Humanos", "Facilitador de desarrollo organizacional", "Orientador"],
        "sectors": ["Salud Mental", "Empresas & Recursos Humanos", "Educación", "Servicios Sociales"]
    },
    {
        "pattern": re.compile(r'\b(arquitect[oa])\b', re.I),
        "primary": "Arquitecto/a",
        "equivalents": ["Arquitecto", "Arquitecto proyectista", "Inspector técnico de obras", "Coordinador de proyectos", "Coordinador BIM"],
        "related": ["Planificador urbano", "Supervisor de edificación", "Evaluador inmobiliario", "Modelador BIM"],
        "sectors": ["Arquitectura & Urbanismo", "Construcción", "Inmobiliario", "Obras Públicas"]
    },
    {
        "pattern": re.compile(r'\b(constructor(a)?\s+civil|ingenier[oa]\s+en\s+construcci[oó]n|t[eé]cnico\s+en\s+construcci[oó]n)\b', re.I),
        "primary": "Constructor/a Civil",
        "equivalents": ["Constructor Civil", "Ingeniero Constructor", "Jefe de Terreno", "Administrador de Obra", "Inspector Técnico de Obras (ITO)"],
        "related": ["Jefe de cubicaciones y presupuestos", "Prevencionista de obras", "Encargado de calidad"],
        "sectors": ["Construcción", "Infraestructura y Obras Civiles", "Vialidad y Minería"]
    },
    {
        "pattern": re.compile(r'\b(abogad[oa]|licenciad[oa]\s+en\s+ciencias\s+jur[ií]dicas)\b', re.I),
        "primary": "Abogado/a",
        "equivalents": ["Abogado", "Asesor legal", "Asistente jurídico", "Procurador judicial", "Abogado corporativo"],
        "related": ["Oficial de cumplimiento (Compliance)", "Gestor de contratos", "Mediador", "Consultor regulatorio"],
        "sectors": ["Estudios Jurídicos", "Sector Público", "Banca y Finanzas", "Empresas Corporativas"]
    },
    {
        "pattern": re.compile(r'\b(profesor(a)?|docente|licenciad[oa]\s+en\s+educaci[oó]n|pedagog[oa])\b', re.I),
        "primary": "Profesor/a / Docente",
        "equivalents": ["Profesor", "Docente", "Educador", "Profesor de aula", "Coordinador pedagógico", "Jefe de UTP"],
        "related": ["Diseñador instruccional", "Tutor académico", "Capacitador corporativo", "Creador de contenidos educativos"],
        "sectors": ["Colegios y Liceos", "Institutos Profesionales", "Universidades", "Educación y Capacitación"]
    },
    {
        "pattern": re.compile(r'\b(educador(a)?\s+de\s+p[aá]rvulos|t[eé]cnico\s+en\s+educaci[oó]n\s+parvularia)\b', re.I),
        "primary": "Educador/a de Párvulos",
        "equivalents": ["Educadora de Párvulos", "Técnico en Educación Parvularia", "Asistente de Párvulos", "Coordinadora de Jardín Infantil"],
        "related": ["Animador pedagógico", "Gestor de centros infantiles", "Monitor infantil"],
        "sectors": ["JUNJI / Integra", "Jardines Infantiles", "Colegios", "Centros Comunitarios"]
    },
    {
        "pattern": re.compile(r'\b(contador(a)?|auditor(a)?|contador(a)?\s+general)\b', re.I),
        "primary": "Contador/a Auditor",
        "equivalents": ["Contador Auditor", "Contador General", "Analista Contable", "Encargado de Finanzas", "Auditor Interno"],
        "related": ["Analista tributario", "Encargado de remuneraciones", "Analista financiero"],
        "sectors": ["Finanzas y Contabilidad", "Consultoras & Auditoría", "Pymes y Corporaciones", "Sector Público"]
    },
    {
        "pattern": re.compile(r'\b(ingenier[oa]\s+comercial|administrador(a)?\s+p[uú]blic[oa]|ingenier[oa]\s+en\s+administraci[oó]n)\b', re.I),
        "primary": "Ingeniero/a Comercial / Administrador",
        "equivalents": ["Ingeniero Comercial", "Administrador Público", "Analista de Gestión", "Jefe de Operaciones", "Jefe de Administración"],
        "related": ["Analista de compras y abastecimiento", "Planificador financiero", "Product Manager"],
        "sectors": ["Sector Público", "Banca y Retail", "Servicios Corporativos", "Logística"]
    },
    {
        "pattern": re.compile(r'\b(m[uú]sic[oa]|int[eé]rprete\s+musical|compositor(a)?|productor(a)?\s+musical)\b', re.I),
        "primary": "Músico / Productor Musical",
        "equivalents": ["Músico", "Profesor de música", "Productor musical", "Intérprete instrumental", "Gestor cultural"],
        "related": ["Diseñador de sonido", "Coordinador de eventos y espectáculos", "Monitor de talleres artísticos"],
        "sectors": ["Industria Creativa", "Educación Artística", "Producción Audiovisual", "Centros Culturales"]
    },
    {
        "pattern": re.compile(r'\b(dise[ñn]ador(a)?\s+gr[aá]fic[oa]|dise[ñn]ador(a)?\s+ui|dise[ñn]ador(a)?\s+ux|dise[ñn]ador(a)?\s+industrial)\b', re.I),
        "primary": "Diseñador/a Gráfico / Visual",
        "equivalents": ["Diseñador Gráfico", "Diseñador UI/UX", "Diseñador Visual", "Director de Arte", "Diseñador Digital"],
        "related": ["Creativo publicitario", "Animador digital", "Especialista en branding"],
        "sectors": ["Agencias de Publicidad", "Tecnología", "Medios de Comunicación", "Branding y Retail"]
    },
    {
        "pattern": re.compile(r'\b(ingenier[oa]\s+(?:en\s+)?inform[aá]tica|desarrollador(a)?|programador(a)?|software\s+engineer|developer|analista\s+de\s+sistemas)\b', re.I),
        "primary": "Ingeniero/a en Informática",
        "equivalents": ["Ingeniero en Informática", "Desarrollador de Software", "Analista Programador", "Ingeniero de Software", "Full Stack Developer"],
        "related": ["Consultor TI", "Administrador de Sistemas", "Líder Técnico", "Especialista Cloud"],
        "sectors": ["Tecnología de la Información", "Fintech & Banca", "Telecomunicaciones", "Software & Startups"]
    }
]

def _infer_profession_metadata(text: str) -> Dict[str, Any]:
    """Infers profession taxonomy from raw CV text without arbitrary restrictions."""
    for entry in UNIVERSAL_PROFESSION_MAP:
        m = entry["pattern"].search(text)
        if m:
            matched_clean = m.group(0).strip().title()
            return {
                "primary": entry["primary"] if len(matched_clean) < 4 else matched_clean,
                "equivalents": entry["equivalents"],
                "related": entry["related"],
                "sectors": entry["sectors"]
            }
    # Fallback to headline or first professional line
    first_lines = [l.strip() for l in text.splitlines() if len(l.strip()) > 4][:5]
    detected = first_lines[1] if len(first_lines) > 1 else "Profesional"
    return {
        "primary": detected,
        "equivalents": [detected],
        "related": ["Consultor / Especialista"],
        "sectors": ["Servicios Profesionales"]
    }

_SECTION_HEADINGS = {
    "summary": ["perfil profesional", "perfil", "resumen", "resumen profesional", "extracto", "sobre mi", "objetivo",
                "objetivo profesional", "presentacion"],
    "experience": ["experiencia laboral", "experiencia profesional", "experiencia", "historial laboral",
                   "antecedentes laborales", "trayectoria laboral", "trayectoria profesional", "empleos"],
    # Secciones mixtas ("Educación y certificaciones") van a educación: ahí cada línea se clasifica como título o curso.
    "education": ["formacion academica", "educacion", "estudios", "antecedentes academicos", "titulos",
                  "formacion", "titulos y grados", "formacion profesional", "education", "academic background",
                  "educacion y certificaciones", "educacion y cursos", "formacion y cursos", "formacion y certificaciones",
                  "estudios y cursos", "estudios y certificaciones", "formacion academica y cursos",
                  "formacion academica y certificaciones", "educacion y formacion", "estudios realizados",
                  "titulos y certificaciones", "educacion y capacitacion", "formacion y capacitacion"],
    "courses": ["cursos", "capacitaciones", "certificaciones", "cursos y certificaciones", "cursos y capacitaciones",
                "perfeccionamiento", "formacion complementaria", "diplomados y cursos", "licencias", "certificados",
                "certificaciones y cursos", "cursos y certificados", "capacitaciones y cursos", "certifications",
                "courses", "training", "licenses and certifications", "licencias y certificaciones",
                "cursos realizados", "capacitacion", "bootcamps", "cursos y talleres", "otros cursos"],
    "skills": ["habilidades", "competencias", "conocimientos", "habilidades tecnicas", "competencias tecnicas",
               "skills", "herramientas", "software", "conocimientos tecnicos", "aptitudes"],
    "experience_prev": ["experiencia anterior", "otras experiencias", "experiencia previa", "experiencia adicional",
                        "otros empleos", "experiencias anteriores"],
    "languages": ["idiomas", "idioma", "languages"],
    "contact": ["contacto", "datos de contacto", "contact", "informacion de contacto", "contactame"],
    "other": ["referencias", "referencias laborales", "intereses", "datos personales", "informacion adicional",
              "otros antecedentes", "pretension de renta", "disponibilidad"],
}
_HEADING_INDEX = {h: sec for sec, hs in _SECTION_HEADINGS.items() for h in hs}
_MONTHS = r"(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|set(?:iembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)"
_DATE = rf"(?:{_MONTHS}\.?\s*(?:de\s+)?)?(?:\d{{1,2}}/)?(?:19|20)\d{{2}}"
_RANGE_RE = re.compile(rf"({_DATE})\s*(?:-|–|—|a|al|hasta)\s*({_DATE}|actual(?:idad)?|presente|a la fecha|hoy)", re.I)
_YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")
_BULLET_RE = re.compile(r"^[●•▪■◦\-–*·]\s*")


def _collapse_spaced(line: str) -> str:
    """'E X P E R I E N C I A  L A B O R A L' -> 'EXPERIENCIA LABORAL' (títulos con letras espaciadas)."""
    if re.fullmatch(r"(?:\S ){3,}\S(?:\s{2,}(?:\S ){1,}\S)*", line.strip()):
        return " ".join(w.replace(" ", "") for w in re.split(r"\s{2,}", line.strip()))
    return line


def _heading_of(line: str) -> Optional[str]:
    t = re.sub(r"[^a-z\s]", " ", _norm(_collapse_spaced(line)))
    t = re.sub(r"\s+", " ", t).strip()
    if not t or len(t) > 45:
        return None
    return _HEADING_INDEX.get(t)


_HEADINGS_BY_LENGTH = sorted(_HEADING_INDEX, key=len, reverse=True)
# Palabras que dentro de una experiencia son una etiqueta ("Herramientas: Excel…"), no el inicio de otra sección.
_WEAK_HEADINGS = {"herramientas", "software", "conocimientos", "aptitudes", "skills", "tecnologias", "conocimientos tecnicos"}


def _inline_heading(line: str) -> "tuple[Optional[str], str]":
    """'HABILIDADES: Python, React' o 'EDUCACIÓN Ingeniero en…' -> ('skills', 'Python, React')."""
    stripped = _BULLET_RE.sub("", line).strip()
    norm = _norm(stripped)
    for h in _HEADINGS_BY_LENGTH:
        if norm.startswith(h) and len(norm) > len(h):
            head_raw = stripped[: len(h)]
            rest = stripped[len(h):]
            # Solo si el título va en MAYÚSCULAS, o seguido de ":" si no es una etiqueta débil ("Herramientas:").
            colon = rest.lstrip().startswith(":")
            if rest[:1] in (":", " ") and (head_raw.isupper() or (colon and h not in _WEAK_HEADINGS)):
                return _HEADING_INDEX[h], rest.lstrip(" :–-").strip()
    return None, line


def _split_sections(text: str) -> Dict[str, List[str]]:
    sections: Dict[str, List[str]] = {"header": []}
    current = "header"
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            sections.setdefault(current, []).append("")
            continue
        head = _heading_of(_BULLET_RE.sub("", line).rstrip(":").strip())
        weak = re.sub(r"[^a-z\s]", "", _norm(line)).strip() in _WEAK_HEADINGS
        if head and current in ("experience", "experience_prev") and weak:
            head = None  # "Herramientas" dentro de una experiencia
        if head:
            current = head
            sections.setdefault(current, [])
            continue
        head, rest = _inline_heading(line)
        if head and current in ("experience", "experience_prev") and head == "skills" and not _BULLET_RE.sub("", line).strip()[:12].isupper():
            head = None
        if head:
            current = head
            sections.setdefault(current, [])
            if rest:
                sections[current].append(rest)
            continue
        sections.setdefault(current, []).append(line)
    return sections


def _blocks(lines: List[str]) -> List[List[str]]:
    """Agrupa líneas en bloques separados por líneas vacías."""
    out, cur = [], []
    for l in lines:
        if not l:
            if cur:
                out.append(cur)
                cur = []
        else:
            cur.append(l)
    if cur:
        out.append(cur)
    return out


_TOOLS_RE = re.compile(r"(?i)\b(?:herramientas|tecnolog[ií]as|tools|software)\s*:\s*")
_CONNECTOR_END_RE = re.compile(r"(?i)\b(de|del|la|las|los|y|e|en|para|con|el|al)$")


def _split_top(text: str, seps: str = ",;·•|") -> List[str]:
    """Separa por los separadores dados, pero no dentro de paréntesis: 'Bases de datos (MySQL · SQL Server)' es uno."""
    out, cur, depth = [], "", 0
    for ch in text:
        depth += 1 if ch == "(" else -1 if ch == ")" and depth else 0
        if ch in seps and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return [x.strip(" .") for x in out if x.strip(" .")]


def _split_place(rest: str) -> "tuple[str, str]":
    """'| San Pedro de la Paz, Región del Biobío, Chile Responsable de…' -> (lugar, descripción)."""
    rest = rest.strip(" |·-–—")
    m = re.search(r"\bChile\b\.?", rest)
    if m and m.start() < 90:
        return rest[: m.end()].strip(" ,."), rest[m.end():].lstrip(" .,|").rstrip()
    words = rest.split()
    for i in range(1, min(len(words) - 1, 12)):
        prev, cur, nxt = words[i - 1], words[i], words[i + 1]
        if prev[:1].islower() and cur[:1].isupper() and nxt[:1].islower() and prev not in ("de", "del", "la", "las", "los", "y"):
            return " ".join(words[:i]).strip(" ,"), " ".join(words[i:]).strip()
    if len(rest) <= 60 and not rest.endswith("."):
        return rest, ""
    return "", rest


def _join_header(lines: List[str]) -> List[str]:
    """Une encabezados partidos en dos líneas ('…de la Región del' + 'Biobío')."""
    out: List[str] = []
    for l in lines:
        if out and (_CONNECTOR_END_RE.search(out[-1]) or (len(l.split()) <= 2 and not re.search(r"[—–|·]", l))):
            out[-1] = f"{out[-1]} {l}"
        else:
            out.append(l)
    return out


def _role_company(header: List[str]) -> "tuple[str, str]":
    joined = _join_header(header)
    text = " ".join(joined).strip(" |-–—")
    for sep in (r"\s—\s", r"\s\|\s", r"\s·\s", r"\s–\s", r"\s-\s", r",\s(?=[A-ZÁÉÍÓÚ])"):
        parts = re.split(sep, text, maxsplit=1)
        if len(parts) == 2 and parts[0].strip() and parts[1].strip():
            return parts[0].strip(), parts[1].strip()
    if len(joined) >= 2:  # cargo en una línea y empresa en la siguiente
        return joined[0].strip(), " ".join(joined[1:]).strip()
    return (text or "Cargo"), ""


def _sentences(text: str) -> List[str]:
    return [x.strip(" .") for x in re.split(r"(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÑ¿])", text) if len(x.strip(" .")) > 3]


def _parse_experiences(lines: List[str], loc: str) -> List[WorkExperience]:
    """
    Cada experiencia: encabezado (cargo — empresa, puede ocupar 2 líneas), una línea con el rango de fechas
    (que puede traer también "| Ciudad, Región, Chile" y el inicio de la descripción), y el cuerpo.
    Una línea es encabezado si la siguiente (o la subsiguiente) trae un rango de fechas.
    """
    rows = [l for l in lines if l]
    entries: List[Dict[str, Any]] = []
    pending: List[str] = []
    for i, line in enumerate(rows):
        m = _RANGE_RE.search(line)
        if m:
            before, after = line[: m.start()].strip(" |,-–—()"), line[m.end():]
            place, desc = _split_place(after)
            header = pending + ([before] if before else [])
            if not header and entries and entries[-1]["body"]:
                header = [entries[-1]["body"].pop()]  # el encabezado quedó pegado al cuerpo anterior
            entries.append({"header": header, "start": m.group(1), "end": m.group(2), "place": place,
                            "body": [desc] if desc else []})
            pending = []
            continue
        nxt = " ".join(rows[i + 1:i + 3])
        next_has_range = bool(_RANGE_RE.search(rows[i + 1])) if i + 1 < len(rows) else False
        next2_has_range = bool(_RANGE_RE.search(rows[i + 2])) if i + 2 < len(rows) else False
        prev_open = i > 0 and rows[i - 1].rstrip().endswith((",", ":", "-", "y"))
        ends_sentence = line.rstrip().endswith((".", ",")) and not re.search(r"(?i)\b(?:s\.a|ltda|spa|inc|ltd|e\.i\.r\.l|s\.p\.a|cía)\.$", line.rstrip())
        is_header_like = len(line) < 140 and not ends_sentence and not _TOOLS_RE.match(line) and not prev_open
        if is_header_like and (next_has_range or (next2_has_range and len(rows[i + 1]) < 60 and not _RANGE_RE.search(line))):
            pending.append(_BULLET_RE.sub("", line))
        elif entries:
            entries[-1]["body"].append(line)
        else:
            pending.append(line)
    experiences: List[WorkExperience] = []
    for e in entries:
        role, company = _role_company(e["header"])
        body = " ".join(e["body"]).strip()
        tech: List[str] = []
        tm = _TOOLS_RE.search(body)
        if tm:
            tech = [t for t in _split_top(body[tm.end():]) if 1 < len(t) <= 40][:40]
            body = body[: tm.start()].strip()
        bullet_lines = [_BULLET_RE.sub("", b) for b in e["body"] if _BULLET_RE.match(b)]
        sentences = _sentences(body)
        description = " ".join(sentences[:2])[:400] if sentences else ""
        achievements = bullet_lines or sentences[2:] or sentences
        experiences.append(WorkExperience(
            company=company, role=role, start_date=e["start"],
            end_date=e["end"].capitalize() if re.match(r"(?i)actual|presente|hoy|a la fecha", e["end"]) else e["end"],
            location=e["place"] or loc, is_remote=bool(re.search(r"(?i)remot", body)), description=description,
            bullet_achievements=[a for a in achievements if len(a) > 3][:8], technologies=tech))
    return experiences


def _parse_previous(lines: List[str], loc: str) -> List[WorkExperience]:
    """'Cargo · Empresa (Julio 2019 – Febrero 2021)', una por línea (la fecha puede quedar en la línea siguiente)."""
    joined: List[str] = []
    for l in [x for x in lines if x]:
        if joined and not _RANGE_RE.search(joined[-1]):
            joined[-1] = f"{joined[-1]} {l}"
        else:
            joined.append(_BULLET_RE.sub("", l))
    out = []
    for l in joined:
        m = _RANGE_RE.search(l)
        if not m:
            continue
        head = (l[: m.start()] + l[m.end():]).strip(" ()|,-–—")
        parts = re.split(r"\s·\s", head)
        role, company = (" · ".join(parts[:-1]), parts[-1]) if len(parts) > 1 else _role_company([head])
        out.append(WorkExperience(company=company.strip(" ()"), role=role.strip(), start_date=m.group(1),
                                  end_date=m.group(2).capitalize() if re.match(r"(?i)actual|presente", m.group(2)) else m.group(2),
                                  location=loc, is_remote=False, description="", bullet_achievements=[], technologies=[]))
    return out


_DEGREE_RE = re.compile(
    r"(?i)\b(ingenier[oa]|ingenier[ií]a|t[eé]cnic[oa]\b|t[eé]cnico de nivel superior|licenciad[oa]|licenciatura|"
    r"mag[ií]ster|master\b|mba\b|doctor(?:ado)?|ph\.?d|diplomado|post[ií]tulo|postgrado|bachiller|"
    r"enseñanza media|ense[ñn]anza b[aá]sica|educaci[oó]n media|cuarto medio|profesor[a]?\b|pedagog[ií]a|"
    r"contador[a]?\b|administrador[a]?\b|abogad[oa]|psic[oó]log[oa]|enfermer[oa]|kinesi[oó]log[oa]|"
    r"arquitect[oa]|constructor[a]? civil|t[ií]tulo|carrera|grado|bachelor|engineer|degree)\b")
_COURSE_LINE_RE = re.compile(
    r"(?i)\b(curso|cursos|capacitaci[oó]n|certificaci[oó]n|certificad[oa]|certificate|certified|certification|"
    r"bootcamp|taller|seminario|workshop|sence|otec|os-?10|licencia de conducir|licencia clase|"
    r"\d+\s*(?:horas|hrs?\.?|h)\b|udemy|coursera|platzi|edx|linkedin learning|google actividate|"
    r"scrum (?:master|foundation)|itil|pmp|aws certified|microsoft certified)\b")
_INSTITUTION_RE = re.compile(
    r"(?i)universidad|instituto|\bcft\b|\bip\b|centro de formaci|liceo|colegio|escuela|inacap|duoc|aiep|"
    r"santo tom[aá]s|university|college|academia|\bu\.\s|pontificia|usach|utfsm|uc\b")


def _stem_set(text: str) -> set:
    return {w[:6] for w in re.findall(r"[a-z0-9]+", _norm(text)) if len(w) >= 4}


def _dedupe_degree(degree: str) -> str:
    """'Ingeniero en Informática en Ingeniería en informática' -> 'Ingeniero en Informática'."""
    d = re.sub(r"\s+", " ", degree or "").strip()
    positions = [m.start() for m in re.finditer(r"\sen\s", d)]
    for pos in positions:
        left, right = d[:pos].strip(), d[pos + 4:].strip()
        rs = _stem_set(right)
        if rs and rs <= _stem_set(left):
            return left
    return d


def _is_course(line: str) -> bool:
    return bool(_COURSE_LINE_RE.search(line)) and not re.search(r"(?i)diplomado|mag[ií]ster|post[ií]tulo", line)


def _split_education(lines: List[str]) -> "tuple[List[EducationItem], List[str]]":
    """
    Educación línea a línea (los PDF casi nunca traen líneas vacías entre títulos):
    - una línea con palabras de título (Ingeniero, Técnico, Magíster, Diplomado…) empieza un título nuevo;
    - las líneas siguientes con institución o año completan ese título;
    - las líneas de cursos, certificaciones o bootcamps (con horas) van a "Certificaciones y cursos".
    """
    items: List[Dict[str, str]] = []
    courses: List[str] = []
    last_kind = ""
    for raw in lines:
        line = _BULLET_RE.sub("", raw or "").strip()
        if not line:
            continue
        years = re.findall(r"(?:19|20)\d{2}", line)
        if _is_course(line):
            courses.append(line)
            last_kind = "course"
            continue
        clean = re.sub(r"\(?\b(?:19|20)\d{2}\b\)?", "", _RANGE_RE.sub("", line))
        parts = [p.strip(" |,-–—()") for p in re.split(r"\s*[|–—]\s*|\s-\s|,\s(?=[A-ZÁÉÍÓÚ])", clean) if p.strip(" |,-–—()")]
        inst = ", ".join(p for p in parts if _INSTITUTION_RE.search(p))
        degree_part = next((p for p in parts if p != inst and _DEGREE_RE.search(p)), "")
        if not degree_part and parts and not inst and len(parts) > 1 and (not items or len(line) > 25):
            degree_part, inst = parts[0], ", ".join(parts[1:3])  # "Desarrollador Full Stack…, Desafío Latam"
        if not inst and degree_part and len(parts) > 1:
            # "Desarrollador Full Stack…, Desafío Latam (2026)": la parte que no es el título es la institución.
            others = [p for p in parts if p != degree_part]
            inst = ", ".join(others[:2])
        degree_part = _dedupe_degree(degree_part)
        if degree_part or (not items and parts and not inst):
            items.append({"degree": degree_part or parts[0], "institution": inst, "year": years[-1] if years else ""})
            last_kind = "degree"
        elif last_kind == "course" and courses and (inst or years) and len(line) < 90:
            courses[-1] = f"{courses[-1]} — {line}"  # institución o año del curso anterior
        elif items:
            cur = items[-1]
            if inst and not cur["institution"]:
                cur["institution"] = inst
            if years and not cur["year"]:
                cur["year"] = years[-1]
            rest = [p for p in parts if p != inst]
            if rest and not inst and not years and len(rest[0]) < 60 and not cur.get("field"):
                cur["field"] = rest[0]  # "en Informática" en la línea siguiente
        elif inst:
            items.append({"degree": "", "institution": inst, "year": years[-1] if years else ""})
            last_kind = "degree"
    education = [EducationItem(institution=i["institution"], degree=i["degree"], field_of_study=i.get("field", ""),
                               graduation_year=i["year"]) for i in items if i["degree"] or i["institution"]]
    return education, courses


def _parse_education(lines: List[str]) -> List[EducationItem]:
    """Compatibilidad: solo los títulos (los cursos los devuelve _split_education)."""
    return _split_education(lines)[0]


def _split_courses(lines: List[str], merge_continuations: bool = True) -> List[str]:
    """
    Un curso por línea (no se corta en comas: "Curso de Python, 40 horas" es un solo curso).
    Si la línea siguiente es solo la institución o el año ("Desafío Latam 2019"), se une al curso anterior.
    """
    out: List[str] = []
    for raw in lines:
        line = _BULLET_RE.sub("", raw or "").strip()
        if not line:
            continue
        pieces = [p.strip() for p in re.split(r"\s*[●•▪■;]\s*", line) if p.strip()]
        is_continuation = (merge_continuations and len(pieces) == 1 and out and not _BULLET_RE.match(raw.strip())
                           and not _is_course(line) and len(line) < 60 and len(line.split()) <= 6
                           and (_INSTITUTION_RE.search(line) or re.fullmatch(r"[\wÁÉÍÓÚáéíóúñÑ .-]*(?:19|20)\d{2}\)?", line)))
        if is_continuation:
            out[-1] = f"{out[-1]} — {line}"
            continue
        out += [p for p in pieces if len(p) > 3]
    return list(dict.fromkeys(out))


_LIST_SPLIT_RE = re.compile(r"\s*(?:[●•▪■◦|;/]|\s·\s|\s-\s|\s–\s|,(?![^()]*\)))\s*")


def _split_list(lines) -> List[str]:
    """Habilidades, herramientas o palabras clave: un elemento por cosa, aunque vengan en una sola línea."""
    if isinstance(lines, str):
        lines = lines.splitlines()
    out: List[str] = []
    for l in lines or []:
        if not l:
            continue
        for chunk in [c for part in _split_top(_BULLET_RE.sub("", str(l)), ",;·•|/●▪■◦") for c in re.split(r"\s[-–]\s", part)]:
            chunk = re.sub(r"^[A-Za-zÁÉÍÓÚáéíóú\s]{2,25}:\s*", "", chunk.strip(" .")).strip()
            if 1 < len(chunk) < 70 and _norm(chunk) not in {_norm(x) for x in out}:
                out.append(chunk)
    return out


_LANGUAGE_NAMES = r"español|ingl[eé]s|portugu[eé]s|franc[eé]s|alem[aá]n|italiano|chino|mandar[ií]n|japon[eé]s|coreano|ruso|[aá]rabe|mapudungun|quechua|aymara|catal[aá]n|holand[eé]s|sueco|hebreo|english|spanish|portuguese|french|german|italian|lengua de señas"
_LEVEL_RE = re.compile(r"(?i)(nativ[oa]|materna|biling[uü]e|avanzado|intermedio(?:\s*-?\s*(?:alto|bajo))?|b[aá]sico|elemental|fluido|profesional|t[eé]cnico|\b[abc][12]\b|native|fluent|advanced|intermediate|basic)")


def parse_languages(value) -> Dict[str, str]:
    """'Inglés: intermedio · Español nativo', ['Inglés (B2)'] o {'Inglés': 'B2'} -> {'Inglés': 'Intermedio (B2)'...}."""
    if isinstance(value, dict):
        return {str(k).strip().capitalize(): str(v).strip().capitalize() or "Intermedio" for k, v in value.items() if str(k).strip()}
    items = value if isinstance(value, list) else re.split(r"[\n●•|;,]", str(value or ""))
    out: Dict[str, str] = {}
    for item in items:
        text = _BULLET_RE.sub("", str(item)).strip()
        for m in re.finditer(rf"(?i)\b({_LANGUAGE_NAMES})\b", text):
            tail = text[m.end(): m.end() + 40]
            lvl = _LEVEL_RE.search(tail) or _LEVEL_RE.search(text)
            name = m.group(1).capitalize()
            out.setdefault(name, lvl.group(1).capitalize() if lvl else "Intermedio")
    return out


def _sort_courses(courses: List[str]) -> List[str]:
    """Cursos del más reciente al más antiguo (los sin año, al final y en su orden)."""
    def year(c: str) -> int:
        ys = re.findall(r"(?:19|20)\d{2}", c)
        return int(ys[-1]) if ys else 0
    return [c for _, c in sorted(enumerate(courses), key=lambda t: (-year(t[1]), t[0]))]


def deterministic_cv_parser(text: str) -> CandidateProfile:
    """
    Lector por secciones, sin IA. Reconoce los títulos de sección como líneas propias
    (Experiencia laboral, Formación académica, Cursos, Habilidades, Idiomas) en vez de buscar la palabra
    en cualquier parte del texto. Funciona para cualquier profesión u oficio.
    """
    sections = _split_sections(text)
    header_lines = [l for l in sections.get("header", []) if l]

    # Nombre: primera línea con 2 a 5 palabras sin dígitos ni @. En CV de dos columnas la barra lateral
    # (Contacto, Habilidades, Idiomas) sale primero: el nombre puede quedar como línea "suelta" de esas secciones.
    def looks_like_name(l: str) -> bool:
        words = l.split()
        return (1 < len(words) <= 5 and not re.search(r"[\d@:/|]", l) and not _heading_of(l)
                and all(w[:1].isupper() for w in words if len(w) > 3)
                and not re.search(rf"(?i)\b({_LANGUAGE_NAMES})\b", l) and not _DEGREE_RE.search(l) and not _COURSE_LINE_RE.search(l))
    loose = [l for sec in ("contact", "languages", "other") for l in sections.get(sec, []) if l and looks_like_name(l)]
    name = next((l for l in header_lines[:6] if looks_like_name(l)), None) or (loose[0] if loose else None)
    if not name and header_lines:
        # La primera línea puede traer el nombre junto al correo o teléfono: se corta antes de ellos.
        first = re.split(r"\s+[\w.+-]+@|\s*[|•·,;]\s*|\s+\+?\d", header_lines[0])[0].strip()
        name = first[:60] if len(first.split()) >= 2 else header_lines[0][:40]
    name = name or "Candidato"

    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    phone_match = re.search(r"(?:\+?56\s?)?(?:9[\s.-]?)\d{4}[\s.-]?\d{4}", text) or re.search(r"Tel[eé]fono:\s*([^\n|]+)", text, re.I)
    loc_match = re.search(r"(?:Ubicaci[oó]n|Direcci[oó]n|Ciudad|Comuna):\s*([^\n|]+)", text, re.I)
    loc = loc_match.group(1).strip() if loc_match else "Chile"
    detected_reg, detected_comm, _ = detect_region_and_commune(f"{loc} {text[:800]}")
    linkedin_match = re.search(r"https?://[^\s|]*linkedin[^\s|]*", text, re.I)
    portfolio_match = re.search(r"https?://[^\s|]*(?:github|behance|portfolio|artstation)[^\s|]*", text, re.I)

    prof_meta = _infer_profession_metadata(text)
    primary_profession = prof_meta["primary"]
    pool = header_lines[1:6] + [l for sec in ("contact", "languages", "other") for l in sections.get(sec, []) if l]
    contact_re = re.compile(r"\S+@\S+|https?://\S+|www\.\S+|\S*linkedin\S*|\S*github\S*|\+?\d[\d\s().-]{7,}")
    headline_line = None
    for idx, l in enumerate(pool):
        if l == name or _heading_of(l) or re.search(rf"(?i)^\s*({_LANGUAGE_NAMES})\b", l):
            continue
        part = contact_re.split(l)[0].strip(" |·,")
        if len(part) < 4:
            continue
        if l.rstrip().endswith("|") and idx + 1 < len(pool):
            part = f"{part} | {contact_re.split(pool[idx + 1])[0].strip(' |·,')}".strip(" |")
        headline_line = part[:160]
        break
    headline = headline_line or primary_profession

    summary = " ".join(l for l in sections.get("summary", []) if l)[:1200]

    experiences = _parse_experiences(sections.get("experience", []), loc) + _parse_previous(sections.get("experience_prev", []), loc)
    education, courses_in_education = _split_education(sections.get("education", []))
    certifications = _sort_courses(list(dict.fromkeys(_split_courses(sections.get("courses", [])) + courses_in_education)))
    # Diplomados y títulos que quedaron en "cursos" pasan a educación.
    for c in list(certifications):
        if re.search(r"(?i)diplomado|post[ií]tulo|mag[ií]ster|t[ií]tulo", c):
            certifications.remove(c)
            education.append(EducationItem(institution="", degree=c, field_of_study="", graduation_year=""))

    technical_skills, soft_skills = [], []
    skill_lines = [l for l in sections.get("skills", []) if l]
    if any(re.search(r"[·,;|•]", l) for l in skill_lines) and not all(_BULLET_RE.match(l) for l in skill_lines):
        # Lista partida en varias líneas: se une con espacio si la línea quedó a medias ("(MySQL · SQL" + "Server)"),
        # y con separador si la línea terminó un elemento ("… Scrum" + "Liderazgo, …").
        merged = skill_lines[0]
        for nxt in skill_lines[1:]:
            unclosed = merged.count("(") > merged.count(")")
            mid = unclosed or bool(_CONNECTOR_END_RE.search(merged)) or nxt[:1].islower()
            merged = f"{merged}{' ' if mid else ' · '}{nxt}"
        skill_lines = [merged]
    for val in _split_list(skill_lines):
        is_soft = any(k in val.lower() for k in ["liderazgo", "comunicación", "comunicacion", "trabajo en equipo",
                                                "resolución", "empatía", "proactiv", "responsab", "adaptabilidad"])
        (soft_skills if is_soft else technical_skills).append(val)

    languages = parse_languages([l for l in sections.get("languages", []) if l])
    if not languages:
        # Sin sección Idiomas: se buscan menciones claras en todo el texto ("Inglés intermedio", "Inglés B2").
        found = parse_languages([m.group(0) for m in re.finditer(rf"(?i)\b(?:{_LANGUAGE_NAMES})\b[^\n,;|]{{0,25}}", text) if _LEVEL_RE.search(m.group(0))])
        languages = found

    # Años de experiencia: suma de los rangos detectados (o el número declarado).
    years = 0.0
    for e in experiences:
        ys = [int(y) for y in re.findall(r"(?:19|20)\d{2}", f"{e.start_date} {e.end_date}")]
        end_y = ys[-1] if len(ys) > 1 else (2026 if re.match(r"(?i)actual|presente|hoy|a la fecha", e.end_date or "") else (ys[0] if ys else 0))
        if ys:
            years += max(0, end_y - ys[0])
    if not years:
        m = re.search(r"(\d+)\s*(?:\+)?\s*a[ñn]os\s+de\s+experiencia", text, re.I)
        years = float(m.group(1)) if m else 0.0

    return CandidateProfile(
        name=name, email=email_match.group(0) if email_match else None,
        phone=(phone_match.group(1) if phone_match and phone_match.groups() else phone_match.group(0)).strip() if phone_match else None,
        location=loc, linkedin_url=linkedin_match.group(0) if linkedin_match else None,
        portfolio_url=portfolio_match.group(0) if portfolio_match else None,
        headline=headline, summary=summary, years_of_experience=years,
        primary_profession=primary_profession, secondary_professions=[],
        equivalent_roles=prof_meta["equivalents"], related_roles=prof_meta["related"], economic_sectors=prof_meta["sectors"],
        seniority_level="Profesional Especialista" if years >= 4 else "Profesional",
        region=detected_reg, commune=detected_comm,
        technical_skills=technical_skills, soft_skills=soft_skills, languages=languages,
        experiences=experiences, education=education, certifications=certifications, raw_cv_text=text,
        keywords=_keywords_from(technical_skills, experiences),
    )

_LINK_LABELS = [
    ("linkedin.", "LinkedIn"),
    ("github.", "GitHub"),
    ("gitlab.", "GitLab"),
    ("behance.", "Behance"),
    ("dribbble.", "Dribbble"),
    ("artstation.", "ArtStation"),
    ("youtube.", "YouTube"),
    ("instagram.", "Instagram"),
    ("superdesalud.", "Registro de Prestadores de Salud"),
]


def attach_links_from_text(profile: CandidateProfile, raw_text: str) -> CandidateProfile:
    """
    Detecta TODOS los enlaces del CV (no solo LinkedIn) y los guarda con nombre en profile.links.
    Mantiene linkedin_url/portfolio_url por compatibilidad.
    """
    found = []
    seen = set()
    candidates = re.findall(
        r'(?:https?://|www\.)[^\s|,;<>()"\']+'
        r'|\b(?:[a-z]{2,3}\.)?(?:linkedin|github|gitlab|behance|dribbble)\.com/[^\s|,;<>()"\']+',
        raw_text or "", re.I,
    )
    for extra in (profile.linkedin_url, profile.portfolio_url, profile.github_url):
        if extra:
            candidates.append(extra)
    for url in candidates:
        url = url.rstrip('.').strip()
        if not url.lower().startswith("http"):
            url = "https://" + url
        key = url.lower().rstrip('/')
        if key in seen:
            continue
        seen.add(key)
        label = next((name for needle, name in _LINK_LABELS if needle in key), "Sitio web")
        found.append(ProfileLink(label=label, url=url))
    existing = {l.url.lower().rstrip('/') for l in (profile.links or [])}
    profile.links = list(profile.links or []) + [l for l in found if l.url.lower().rstrip('/') not in existing]
    if not profile.linkedin_url:
        li = next((l.url for l in profile.links if l.label == "LinkedIn"), None)
        profile.linkedin_url = li
    return profile


CV_SYSTEM_PROMPT = (
    "Eres un analista experto de talento y empleabilidad para cualquier profesión, oficio o especialidad en Chile. "
    "Extraes de forma fiel y verificable la información del currículum, SIN inventar datos, títulos, empresas ni "
    "competencias. Identificas la profesión real de la persona y no condicionas la respuesta al área TI."
)

CV_PROMPT = """
Analiza el currículum y devuelve un JSON EXACTO con esta estructura:
{{
  "name": "Nombre completo",
  "email": "correo", "phone": "teléfono", "location": "ubicación declarada",
  "detected_region": "Región de Chile si se indica", "detected_commune": "Comuna si se indica",
  "linkedin_url": "url", "portfolio_url": "url",
  "headline": "Titular profesional", "summary": "Resumen basado estrictamente en el CV",
  "primary_profession": "Profesión u oficio principal",
  "secondary_professions": ["Otras profesiones u oficios que ejerce o en que está titulado"],
  "equivalent_roles": ["Nombres equivalentes del cargo en portales de empleo de Chile"],
  "related_roles": ["Cargos a los que puede postular por su experiencia"],
  "economic_sectors": ["Sectores económicos afines"],
  "seniority_level": "Junior | Semi-Senior | Senior | Jefatura | Especialista",
  "years_of_experience": 5.0,
  "technical_skills": ["Competencias técnicas"], "soft_skills": ["Habilidades transversales"],
  "languages": {{"Español": "Nativo"}},
  "experiences": [{{"company": "Empresa", "role": "Cargo", "start_date": "Mes Año", "end_date": "Mes Año o Actual",
                    "location": "Ciudad", "is_remote": false, "description": "Funciones",
                    "technologies": ["Herramientas"], "bullet_achievements": ["Logro"]}}],
  "education": [{{"institution": "Institución", "degree": "Título o grado", "field_of_study": "Carrera o área",
                  "graduation_year": "Año"}}],
  "certifications": ["Nombre completo del curso o certificación — Institución (año)"]
}}

REGLAS DE CLASIFICACIÓN (MUY IMPORTANTES):
1. "experiences": TODOS los trabajos, uno por cada cargo (si en una empresa tuvo dos cargos, son dos entradas).
   Incluye prácticas profesionales, trabajos independientes y voluntariados con funciones. Ordénalos del más
   reciente al más antiguo. Revisa el CV completo: no te detengas en la primera experiencia.
2. "education": SOLO títulos y grados: enseñanza media técnico-profesional, carreras técnicas (CFT, IP),
   carreras profesionales y universitarias, postítulos, diplomados, magíster y doctorados.
3. "certifications": SOLO cursos, capacitaciones, certificaciones y licencias (por ejemplo, curso SENCE, OS-10,
   licencia de conducir, certificación ChileValora). Escribe el NOMBRE COMPLETO de cada curso, no palabras sueltas.
4. Un título NUNCA va en "certifications", y un curso NUNCA va en "education".
5. NUNCA pongas un empleo en "education" ni un título en "experiences".
6. Las habilidades van en "technical_skills" o "soft_skills", nunca en "certifications".
7. Si un dato no está en el CV, déjalo vacío. No lo inventes.

TEXTO DEL CURRÍCULUM:
---
{cv}
---
"""

_COURSE_WORDS = re.compile(r"\b(curso|capacitaci[oó]n|certificaci[oó]n|certificado|licencia|taller|seminario|sence|otec|os-?10)\b", re.I)
_DEGREE_WORDS = re.compile(r"\b(t[ií]tulo|t[eé]cnico|ingenier|licenciad|magíster|magister|mag[ií]ster|doctor|diplomado|post[ií]tulo|"
                           r"bachiller|carrera|profesional|enseñanza media|educaci[oó]n media|universidad|instituto|cft)\b", re.I)


def _norm(text: str) -> str:
    import unicodedata
    t = unicodedata.normalize("NFKD", (text or "").lower())
    return "".join(c for c in t if not unicodedata.combining(c))


def _name_in_text(name: str, raw_text: str) -> bool:
    """El nombre que leyó la IA debe aparecer en el CV (al menos dos de sus palabras), sin importar tildes ni saltos."""
    words = [w for w in re.findall(r"[a-z]+", _norm(name)) if len(w) > 2]
    text = _norm(raw_text)
    return bool(words) and sum(1 for w in words if w in text) >= min(2, len(words))


def _keywords_from(skills: List[str], experiences: List[WorkExperience]) -> List[str]:
    """Palabras clave del CV: habilidades técnicas y herramientas usadas en la experiencia (sin repetir)."""
    out: List[str] = []
    for k in list(skills or []) + [t for e in experiences or [] for t in (e.technologies or [])]:
        k = str(k).strip()
        if 1 < len(k) <= 40 and _norm(k) not in {_norm(x) for x in out}:
            out.append(k)
    return out[:25]


def _as_courses(value) -> List[str]:
    if isinstance(value, str):
        return _split_courses(value.splitlines() if "\n" in value else re.split(r"\s*[●•;]\s*", value), merge_continuations=False)
    out: List[str] = []
    for v in value or []:
        if isinstance(v, dict):
            v = " — ".join(str(x) for x in (v.get("name") or v.get("nombre"), v.get("institution") or v.get("institucion"), v.get("year") or v.get("anio")) if x)
        out += _split_courses(re.split(r"\s*[●•;]\s*", str(v)), merge_continuations=False)
    return out


def _normalize_ai_lists(result: Dict[str, Any]) -> Dict[str, Any]:
    """La IA a veces entrega una lista como texto ("Python, React, SQL") o un solo elemento con todo junto."""
    for key in ("technical_skills", "soft_skills", "secondary_professions", "equivalent_roles", "related_roles", "economic_sectors"):
        result[key] = _split_list(result.get(key) if isinstance(result.get(key), list) else [result.get(key) or ""])
    result["certifications"] = _as_courses(result.get("certifications"))
    result["languages"] = parse_languages(result.get("languages") or {})
    if isinstance(result.get("education"), dict):
        result["education"] = [result["education"]]
    if not isinstance(result.get("education"), list):
        result["education"] = []
    for exp in result.get("experiences") or []:
        if isinstance(exp, dict):
            exp["technologies"] = _split_list(exp.get("technologies") if isinstance(exp.get("technologies"), list) else [exp.get("technologies") or ""])
            ach = exp.get("bullet_achievements")
            exp["bullet_achievements"] = [str(a).strip(" -•") for a in (ach if isinstance(ach, list) else re.split(r"\n|•", str(ach or ""))) if str(a).strip(" -•")]
    return result


def _clean_ai_sections(result: Dict[str, Any]) -> Dict[str, Any]:
    """Corrige clasificaciones típicas: cursos que quedaron como títulos y viceversa, y 'certificaciones' que son habilidades."""
    result = _normalize_ai_lists(result)
    education = [e for e in result.get("education") or [] if isinstance(e, dict)]
    certs = [str(c).strip() for c in result.get("certifications") or [] if str(c).strip()]
    skills = {_norm(x) for x in (result.get("technical_skills") or []) + (result.get("soft_skills") or [])}
    kept_edu = []
    for e in education:
        label = f"{e.get('degree', '')} {e.get('field_of_study', '')}"
        if _COURSE_WORDS.search(label) and not _DEGREE_WORDS.search(label):
            certs.append(" — ".join(x for x in [label.strip(), e.get("institution", "")] if x))
        else:
            kept_edu.append(e)
    # Una "certificación" de 1-2 palabras que además es una habilidad declarada no es una certificación.
    certs = [c for c in certs if not (_norm(c) in skills and len(c.split()) <= 2)]
    seen, unique = set(), []
    for c in certs:
        if _norm(c) not in seen:
            seen.add(_norm(c))
            unique.append(c)
    result["education"] = kept_edu
    result["certifications"] = _sort_courses(unique)
    return result


def _profile_from_ai(result: Dict[str, Any], raw_text: str) -> CandidateProfile:
    result = _clean_ai_sections(result)
    experiences = []
    for exp in result.get("experiences") or []:
        if isinstance(exp, dict) and (exp.get("role") or exp.get("company")):
            exp = {k: v for k, v in exp.items() if v is not None}
            exp.setdefault("company", "")
            exp.setdefault("role", "")
            exp.setdefault("start_date", "")
            exp.setdefault("description", "")
            experiences.append(WorkExperience(**exp))
    education = []
    for edu in result.get("education") or []:
        edu = {k: (v if v is not None else "") for k, v in edu.items()}
        edu.setdefault("institution", "")
        edu.setdefault("degree", "")
        edu.setdefault("field_of_study", "")
        education.append(EducationItem(**edu))
    loc = result.get("location") or "Chile"
    det_reg, det_comm = result.get("detected_region"), result.get("detected_commune")
    if not det_reg or not det_comm:
        r, c, _ = detect_region_and_commune(f"{loc} {raw_text[:800]}")
        det_reg, det_comm = det_reg or r, det_comm or c
    try:
        years = float(result.get("years_of_experience") or 0)
    except (TypeError, ValueError):
        years = 0.0
    profile = CandidateProfile(
        name=result.get("name") or "Candidato",
        email=result.get("email"), phone=result.get("phone"), location=loc,
        linkedin_url=result.get("linkedin_url"), portfolio_url=result.get("portfolio_url"),
        headline=result.get("headline") or result.get("primary_profession") or "Profesional",
        summary=result.get("summary") or "",
        years_of_experience=years,
        primary_profession=result.get("primary_profession"),
        secondary_professions=result.get("secondary_professions") or [],
        equivalent_roles=result.get("equivalent_roles") or [],
        related_roles=result.get("related_roles") or [],
        economic_sectors=result.get("economic_sectors") or [],
        seniority_level=result.get("seniority_level") or "Profesional",
        region=det_reg, commune=det_comm,
        technical_skills=result.get("technical_skills") or [],
        soft_skills=result.get("soft_skills") or [],
        languages=result.get("languages") or {},
        experiences=experiences, education=education,
        certifications=result.get("certifications") or [],
        raw_cv_text=raw_text,
        keywords=_keywords_from(result.get("technical_skills") or [], experiences),
    )
    return attach_links_from_text(profile, raw_text)


def _ai_available() -> bool:
    from app.agents import shared_ai
    from app.agents.llm_context import current_llm_credentials
    creds = current_llm_credentials.get()
    return bool(creds and creds.api_key) or shared_ai.is_enabled() or bool(
        settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY)


def analyze_cv(raw_text: str) -> "tuple[CandidateProfile, str, Optional[str]]":
    """
    Analiza el CV. Devuelve (perfil, método, aviso):
    - método "ia": la IA ordenó experiencia, títulos y cursos (con tu clave o con la IA gratuita aceptada).
    - método "reglas": lector por secciones, sin IA; el aviso explica por qué y cómo mejorar el análisis.
    """
    from app.agents.llm_provider import AIRestingError, AINotConnectedError, LLMProviderError
    note = "Analizamos tu CV sin IA (lectura básica por secciones). Activa la IA y usa «Reanalizar con IA» para ordenar mejor tu experiencia, títulos y cursos."
    if _ai_available():
        try:
            # La IA no recibe correo, teléfono, RUT ni enlaces: no los necesita para ordenar el CV.
            from app.privacy.redact import redact_text
            safe_text, found = redact_text(raw_text[:30000])
            result = llm.generate_json(CV_PROMPT.format(cv=safe_text), system_instruction=CV_SYSTEM_PROMPT)
            if isinstance(result, dict) and _name_in_text(result.get("name") or "", raw_text):
                profile = _profile_from_ai(result, raw_text)
                # Los datos de contacto se toman del CV con reglas, tal como están escritos.
                profile.email = found["emails"][0] if found["emails"] else None
                profile.phone = found["phones"][0] if found["phones"] else None
                return profile, "ia", None
            logger.warning("La IA devolvió un CV que no coincide con el texto; se usa el lector por secciones.")
            note = "La IA no pudo leer bien tu CV; usamos la lectura básica por secciones. Revisa tus datos o vuelve a intentarlo."
        except AIRestingError as e:
            note = e.message + " Mientras tanto usamos la lectura básica por secciones; luego puedes «Reanalizar con IA»."
        except AINotConnectedError:
            pass  # sin clave o sin aceptar la IA gratuita: se usa el aviso por defecto
        except LLMProviderError as e:
            logger.info(f"CV sin IA ({e.code}).")
        except Exception as e:  # noqa: BLE001
            logger.warning(f"LLM parsing failed, falling back to deterministic parser: {type(e).__name__}")
    profile = attach_links_from_text(deterministic_cv_parser(raw_text), raw_text)
    return profile, "reglas", note


def analyze_cv_content(raw_text: str, save_to_db: bool = True) -> CandidateProfile:
    """Compatibilidad: devuelve solo el perfil (y lo guarda si no es modo sin estado)."""
    profile, _, _ = analyze_cv(raw_text)
    if save_to_db:
        db.save_profile(profile)
        _sync_preferences_from_profile(profile)
    return profile

def _sync_preferences_from_profile(profile: CandidateProfile):
    """Updates user search preferences to mirror the parsed profile's profession and region."""
    try:
        prefs = db.get_preferences()
        # Build target roles from primary profession and equivalents
        target_roles = []
        if profile.primary_profession and profile.primary_profession not in target_roles:
            target_roles.append(profile.primary_profession)
        for eq in (profile.equivalent_roles or []):
            if eq not in target_roles:
                target_roles.append(eq)
        if target_roles:
            prefs.target_roles = target_roles[:5]
        
        if profile.region:
            prefs.preferred_region = profile.region
        if profile.commune:
            prefs.preferred_communes = [profile.commune]

        # Ensure national coverage with regional priority is default
        prefs.remote_only = False
        db.save_preferences(prefs)
        logger.info(f"Synchronized preferences: roles={prefs.target_roles}, region={prefs.preferred_region}")
    except Exception as err:
        logger.warning(f"Could not sync preferences from profile: {type(err).__name__}")


def assist_profile_content(section: str, action: str, current_text: str, target_role: Optional[str] = None) -> Dict[str, Any]:
    """
    Assists candidate in refining profile text (headline, summary, achievement bullets)
    without inventing unverifiable facts or hallucinating qualifications.
    """
    has_key = bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY)
    
    if has_key:
        system_prompt = (
            "Eres un consultor de carrera y redactor experto de currículums técnicos de alto impacto. "
            "Tu misión es optimizar la redacción, claridad, tono y presentación del texto profesional del usuario. "
            "REGLAS CRÍTICAS DE CONFIABILIDAD: "
            "1. NO inventes empresas, títulos, tecnologías ni certificaciones que no figuren en el texto. "
            "2. Estructura los logros con verbos de acción y enfoque en resultados verificables. "
            "3. Devuelve SIEMPRE un JSON con: {'original': str, 'suggestion': str, 'reasoning': str}."
        )

        role_clause = f" para orientarlo al cargo objetivo '{target_role}'" if target_role else ""
        prompt = f"""
Sección: {section}
Acción requerida: {action}{role_clause}
Texto actual del usuario:
\"\"\"{current_text}\"\"\"

Optimiza el texto según las mejores prácticas de reclutamiento tecnológico y ATS.
Devuelve el resultado en JSON:
{{
  "original": "{current_text}",
  "suggestion": "Texto mejorado optimizado...",
  "reasoning": "Explicación breve de por qué este cambio potencia el perfil..."
}}
"""
        try:
            result = llm.generate_json(prompt, system_instruction=system_prompt)
            if result and "suggestion" in result:
                return {
                    "original": current_text,
                    "suggestion": result.get("suggestion", current_text),
                    "reasoning": result.get("reasoning", "Mejora de redacción y claridad técnica.")
                }
        except Exception as e:
            logger.warning(f"LLM assist failed, falling back to heuristic assistant: {type(e).__name__}")

    # Heuristic fallback if LLM is offline or fails
    suggestion = current_text.strip()
    reasoning = "Optimización estructural heurística sin falsear datos."

    if section == "headline":
        if action == "shorten":
            parts = [p.strip() for p in current_text.split('|')]
            suggestion = " | ".join(parts[:3]) if len(parts) > 3 else current_text
            reasoning = "Se sintetizó el titular en los 3 pilares clave para máxima legibilidad."
        else:
            if target_role and target_role.lower() not in current_text.lower():
                suggestion = f"{target_role} | {current_text}"
                reasoning = f"Se priorizó el cargo objetivo '{target_role}' al inicio del titular profesional."
            else:
                suggestion = current_text.replace("  ", " ").strip()
                reasoning = "Titular pulido y equilibrado para captar atención en 5 segundos."

    elif section == "summary":
        if action == "shorten":
            sentences = current_text.split('. ')
            suggestion = ". ".join(sentences[:3]) + ("." if not sentences[2].endswith('.') else "")
            reasoning = "Resumen condensado en 3 oraciones de alto impacto (Elevator Pitch)."
        else:
            suggestion = current_text.strip()
            reasoning = "Perfil profesional verificado y estructurado con énfasis en trayectoria demostrable."

    elif section == "experience_bullet":
        if not re.match(r'^(Lideró|Diseñó|Implementó|Optimizó|Desarrolló|Administró|Automatizó|Gestionó)', current_text, re.I):
            suggestion = f"Implementó y optimizó: {current_text}"
            reasoning = "Se inició con un verbo de acción técnica directo para mayor impacto en evaluación ATS."

    return {
        "original": current_text,
        "suggestion": suggestion,
        "reasoning": reasoning
    }


def suggest_roles_from_experience(profile: CandidateProfile) -> List[Dict[str, Any]]:
    """
    Extracts realistic, strategic target roles directly derived from the candidate's CV experience,
    career taxonomy, past job titles, and technical skills.
    Categorized into:
    - 'direct': Immediate match with proven past experience
    - 'leadership': Seniority advancement or leadership coordination roles
    - 'transferable': High affinity roles based on transferable skills
    """
    primary = profile.primary_profession or profile.headline or "Profesional"
    years = profile.years_of_experience
    sector = profile.economic_sectors[0] if profile.economic_sectors else "Área Profesional"
    
    # Check if we have past company/role history
    past_roles = []
    past_companies = []
    for exp in (profile.experiences or []):
        if exp.role and exp.role not in past_roles:
            past_roles.append(exp.role)
        if exp.company and exp.company not in past_companies:
            past_companies.append(exp.company)

    suggested: List[Dict[str, Any]] = []

    # 1. Direct Roles (from primary profession, equivalents, and past experience)
    direct_titles = []
    if primary not in direct_titles:
        direct_titles.append(primary)
    for eq in (profile.equivalent_roles or []):
        if eq not in direct_titles:
            direct_titles.append(eq)
    for pr in past_roles:
        if pr not in direct_titles:
            direct_titles.append(pr)

    for title in direct_titles[:4]:
        company_ref = f" en {past_companies[0]}" if past_companies else ""
        suggested.append({
            "title": title,
            "category": "direct",
            "category_label": "Coincidencia Directa",
            "reasoning": f"Alineado con tus {years:.0f} años de experiencia comprobada{company_ref} y competencias técnicas centrales.",
            "matching_skills": profile.technical_skills[:4],
            "seniority": "Senior / Especialista" if years >= 5 else "Profesional"
        })

    # 2. Leadership & Coordination Roles (based on seniority and sector)
    lead_titles = []
    clean_primary = re.sub(r'\s*\([^)]*\)', '', primary).strip()
    if years >= 3:
        lead_titles.append(f"Coordinador/a de {clean_primary}")
        lead_titles.append(f"Jefatura / Encargado/a de {clean_primary}")
        if years >= 5:
            lead_titles.append(f"Líder / Supervisor/a en {sector}")
    else:
        lead_titles.append(f"{clean_primary} Senior")
        lead_titles.append(f"Especialista en {clean_primary}")

    for title in lead_titles[:3]:
        suggested.append({
            "title": title,
            "category": "leadership",
            "category_label": "Liderazgo & Coordinación",
            "reasoning": f"Proyección natural para asumir responsabilidades de supervisión, optimización de flujos y gestión en {sector}.",
            "matching_skills": (profile.soft_skills + profile.technical_skills)[:4],
            "seniority": "Jefatura / Coordinación" if years >= 4 else "Especialista"
        })

    # 3. Transferable & Specialized Roles (from related roles and cross-disciplinary skills)
    transferable_titles = []
    for rel in (profile.related_roles or []):
        if rel not in transferable_titles and rel not in direct_titles:
            transferable_titles.append(rel)
    
    if not transferable_titles:
        transferable_titles.append(f"Consultor/a Técnico/a en {sector}")
        transferable_titles.append(f"Analista de Calidad y Procesos en {clean_primary}")
        transferable_titles.append(f"Auditor/a / Asesor/a en {sector}")

    for title in transferable_titles[:3]:
        suggested.append({
            "title": title,
            "category": "transferable",
            "category_label": "Habilidades Transferibles",
            "reasoning": f"Aprovecha tus competencias transversales aplicadas a roles de alta demanda en {sector}.",
            "matching_skills": profile.technical_skills[:4],
            "seniority": "Especialista"
        })

    return suggested


def tailor_profile_for_role(profile: CandidateProfile, target_role: str, version_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Tailors candidate headline, professional summary, and prioritizes skills for a target role
    based strictly on their actual CV experiences without fabricating facts or hallucinating qualifications.
    """
    has_key = bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY)
    clean_target = target_role.strip()
    
    if has_key:
        system_prompt = (
            "Eres un consultor senior de empleabilidad y optimizador ATS de clase mundial. "
            "Tu misión es adaptar estratégicamente el currículum del candidato para un cargo objetivo específico, "
            "destacando su experiencia real, competencias y logros más afines. "
            "REGLAS ESTRICTAS DE VERACIDAD (Ley N° 21.719 de Chile): "
            "1. NO inventes empresas, cargos no ejercidos, ni certificaciones que no consten en su CV. "
            "2. 'headline': Titular profesional conciso y moderno enfocado en el cargo objetivo y especialidad. "
            "3. 'summary': Resumen profesional de 4 a 6 líneas estructurado para captar la atención de reclutadores, "
            "   destacando sus años de experiencia real, especialidades y logros verificables pertinentes a este rol. "
            "4. 'selected_skills': Lista de 8 a 15 habilidades técnicas extraídas de las competencias REALES del candidato, "
            "   reordenadas poniendo en primer lugar las más críticas para el cargo objetivo. "
            "5. 'match_rationale': 1 a 2 oraciones explicando por qué el candidato calza sólidamente con este cargo."
        )

        prompt = f"""
CARGO OBJETIVO A POSTULAR: {clean_target}

INFORMACIÓN REAL DEL CANDIDATO (Verificada):
- Nombre: {profile.name}
- Profesión Principal: {profile.primary_profession or profile.headline}
- Años de Experiencia: {profile.years_of_experience}
- Titular Maestro: {profile.headline}
- Resumen Maestro: {profile.summary}
- Competencias Técnicas Reales: {", ".join(profile.technical_skills)}
- Competencias Transversales: {", ".join(profile.soft_skills)}
- Experiencias Laborales Registradas:
{chr(10).join([f"  * {exp.role} en {exp.company} ({exp.start_date} - {exp.end_date}): {exp.description[:180]}" for exp in profile.experiences[:5]])}

Genera la optimización en JSON estricto:
{{
  "headline": "Titular profesional orientado a {clean_target}",
  "summary": "Resumen profesional orientado a {clean_target} basado en su experiencia real",
  "selected_skills": ["Habilidad 1", "Habilidad 2", "..."],
  "match_rationale": "Explicación estratégica de empleabilidad"
}}
"""
        try:
            result = llm.generate_json(prompt, system_instruction=system_prompt)
            if result and result.get("headline") and result.get("summary"):
                raw_skills = result.get("selected_skills", [])
                matched_skills = []
                for s in raw_skills:
                    if any(real.lower() in s.lower() or s.lower() in real.lower() for real in profile.technical_skills):
                        matched_skills.append(s)
                if not matched_skills:
                    matched_skills = profile.technical_skills[:12]

                return {
                    "target_role": clean_target,
                    "version_name": version_name or f"🎯 Versión: {clean_target}",
                    "headline": result.get("headline").strip(),
                    "summary": result.get("summary").strip(),
                    "selected_skills": matched_skills[:15],
                    "match_rationale": result.get("match_rationale", f"Perfil adaptado de forma óptima para '{clean_target}'.")
                }
        except Exception as e:
            logger.warning(f"Error en tailor_profile_for_role con LLM: {type(e).__name__}")

    # Deterministic Heuristic Fallback
    top_skills = profile.technical_skills[:3]
    top_str = " • ".join(top_skills) if top_skills else "Gestión y Excelencia Operativa"
    headline = f"{clean_target} | Especialista en {top_str}"
    
    comp_ref = f" en empresas como {profile.experiences[0].company}" if profile.experiences else ""
    summary = (
        f"Profesional con más de {profile.years_of_experience:.0f} años de experiencia consolidada en {profile.primary_profession or 'su especialidad'}{comp_ref}. "
        f"Cuenta con sólida trayectoria en {clean_target.lower()}, destacando por su rigor técnico, capacidad analítica y orientación a resultados cuantificables. "
        f"Especializado/a en {', '.join(profile.technical_skills[:5]) if profile.technical_skills else 'optimización de procesos y cumplimiento de normativas'}, "
        f"con alto compromiso por la mejora continua y el trabajo interdisciplinario de alto rendimiento."
    )

    # Rank skills by keyword overlap with target_role
    target_words = set(re.findall(r'\w+', clean_target.lower()))
    ranked_skills = sorted(
        profile.technical_skills,
        key=lambda s: sum(1 for w in target_words if w in s.lower()) if len(target_words) > 0 else 0,
        reverse=True
    )

    return {
        "target_role": clean_target,
        "version_name": version_name or f"🎯 Versión: {clean_target}",
        "headline": headline,
        "summary": summary,
        "selected_skills": ranked_skills[:12] if ranked_skills else profile.technical_skills[:12],
        "match_rationale": f"Adaptación estratégica basada en tu experiencia de {profile.years_of_experience:.0f} años en {profile.primary_profession or 'tu área'}."
    }

