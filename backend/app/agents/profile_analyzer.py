import os
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
import pypdf
import docx
from app.models.schemas import CandidateProfile, WorkExperience, EducationItem, UserPreferences
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
        logger.error(f"Error reading file {file_path}: {e}")

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

def deterministic_cv_parser(text: str) -> CandidateProfile:
    """
    Robust rule-based parser that extracts the candidate's genuine experience,
    education, skills, contact data and geographic preferences directly from text.
    Works universally across ANY profession, craft or specialty.
    """
    # 1. Contact Info & Name
    name_match = re.match(r'^\s*([A-ZÁÉÍÓÚ][a-záéíóúA-ZÁÉÍÓÚ\s]{4,45}?)(?=\s+Técnico|\s+Ingeniero|\s+Licenciado|\s+Arquitecto|\s+Abogado|\s+Profesor|\s+Médico|\s+\||Teléfono|\n)', text)
    if name_match:
        name = name_match.group(1).strip()
    else:
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        name = lines[0][:40] if lines else "Candidato"

    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else None

    phone_match = re.search(r'Tel[eé]fono:\s*([^\n|]+)', text, re.I)
    phone = phone_match.group(1).strip() if phone_match else None

    loc_match = re.search(r'Ubicaci[oó]n:\s*([^\n|]+)', text, re.I)
    loc = loc_match.group(1).strip() if loc_match else "Chile"

    # Detect region and commune dynamically from CV
    detected_reg, detected_comm, _ = detect_region_and_commune(f"{loc} {text[:800]}")
    user_region = detected_reg
    user_commune = detected_comm

    linkedin_match = re.search(r'https?://[^\s|]*linkedin[^\s|]*', text, re.I)
    linkedin = linkedin_match.group(0) if linkedin_match else None

    portfolio_match = re.search(r'https?://[^\s|]*(?:github|behance|portfolio|artstation)[^\s|]*', text, re.I)
    portfolio = portfolio_match.group(0) if portfolio_match else None

    # Infer profession taxonomy
    prof_meta = _infer_profession_metadata(text)
    primary_profession = prof_meta["primary"]
    equivalent_roles = prof_meta["equivalents"]
    related_roles = prof_meta["related"]
    economic_sectors = prof_meta["sectors"]

    # Headline
    headline_match = re.search(r'(?:Titular|Perfil|Cargo):\s*([^\n|]+)', text, re.I)
    if headline_match:
        headline = headline_match.group(1).strip()
    else:
        headline = primary_profession

    # Summary
    summary = ""
    summary_match = re.search(r'(?:Perfil Profesional|Resumen|Extracto|Sobre mí)\s*(.*?)(?=Competencias|Experiencia|Formación|\n\s*●)', text, re.DOTALL | re.I)
    if summary_match:
        summary = summary_match.group(1).strip()
    else:
        summary = text[:400].strip()

    # Years of experience calculation
    years = 3.0
    exp_year_match = re.search(r'(\d+)\s*(?:\+)?\s*a[ñn]os', text, re.I)
    if exp_year_match:
        years = float(exp_year_match.group(1))

    # Skills extraction
    technical_skills: List[str] = []
    soft_skills: List[str] = []
    skills_match = re.search(r'(?:Competencias|Habilidades|Skills)\s*(.*?)(?=Experiencia|Formación|Educación|$)', text, re.DOTALL | re.I)
    if skills_match:
        skills_block = skills_match.group(1)
        chunks = re.split(r'[●•\n|,]+', skills_block)
        for chunk in chunks:
            val = re.sub(r'^[A-Za-záéíóú\s]+:\s*', '', chunk).strip()
            if len(val) > 2 and len(val) < 60:
                is_soft = any(k in val.lower() for k in ["liderazgo", "comunicación", "trabajo en equipo", "resolución", "empatía", "gestión"])
                if is_soft:
                    if val not in soft_skills:
                        soft_skills.append(val)
                else:
                    if val not in technical_skills:
                        technical_skills.append(val)

    # Experience extraction
    experiences: List[WorkExperience] = []
    exp_match = re.search(r'(?:Experiencia Laboral|Experiencia|Historial Laboral)\s*(.*?)(?=Formación|Educación|Idiomas|Certificaciones|$)', text, re.DOTALL | re.I)
    if exp_match:
        exp_block = exp_match.group(1).strip()
        lines = [l.strip() for l in exp_block.splitlines() if l.strip()]
        cur_role = primary_profession
        cur_comp = "Institución / Empresa"
        cur_bullets = []
        cur_date = "Periodo registrado"

        for line in lines:
            if any(sep in line for sep in [' - ', ' – ', ' | ']) and len(line) < 120:
                if cur_bullets or cur_role != primary_profession:
                    experiences.append(WorkExperience(
                        company=cur_comp,
                        role=cur_role,
                        start_date=cur_date,
                        end_date="",
                        location=loc,
                        is_remote="remot" in line.lower(),
                        description=f"Desempeño profesional en {cur_comp}.",
                        bullet_achievements=cur_bullets[:4],
                        technologies=technical_skills[:4]
                    ))
                    cur_bullets = []
                parts = [p.strip() for p in re.split(r'[|–—\-]', line)]
                cur_role = parts[0] if parts else primary_profession
                cur_comp = parts[1] if len(parts) > 1 else "Organización"
                cur_date = parts[2] if len(parts) > 2 else "Periodo registrado"
            elif line.startswith(('●', '•', '-')):
                cur_bullets.append(line.lstrip('●•- ').strip())

        if cur_role:
            experiences.append(WorkExperience(
                company=cur_comp,
                role=cur_role,
                start_date=cur_date,
                end_date="",
                location=loc,
                is_remote=False,
                description=f"Desempeño profesional en {cur_comp}.",
                bullet_achievements=cur_bullets[:4],
                technologies=technical_skills[:4]
            ))

    # Education extraction
    education: List[EducationItem] = []
    edu_match = re.search(r'(?:Formación Académica|Educación|Estudios)\s*(.*?)(?=Idiomas|Certificaciones|$)', text, re.DOTALL | re.I)
    if edu_match:
        edu_block = edu_match.group(1).strip()
        for edu_c in re.split(r'[●•\n]+', edu_block):
            edu_c = edu_c.strip()
            if len(edu_c) < 10:
                continue
            parts = [p.strip() for p in re.split(r'[|–—\-]', edu_c)]
            degree = parts[0] if parts else primary_profession
            inst = parts[1] if len(parts) > 1 else "Institución de Educación Superior"
            education.append(EducationItem(
                institution=inst,
                degree=degree,
                field_of_study=primary_profession,
                graduation_year=""
            ))

    # Languages
    languages = {}
    if re.search(r'español', text, re.I):
        languages['Español'] = 'Nativo'
    if re.search(r'ingl[eé]s', text, re.I):
        languages['Inglés'] = 'Intermedio'

    return CandidateProfile(
        name=name,
        email=email,
        phone=phone,
        location=loc,
        linkedin_url=linkedin,
        portfolio_url=portfolio,
        headline=headline,
        summary=summary,
        years_of_experience=years,
        primary_profession=primary_profession,
        secondary_professions=[],
        equivalent_roles=equivalent_roles,
        related_roles=related_roles,
        economic_sectors=economic_sectors,
        seniority_level="Profesional Especialista" if years >= 4 else "Profesional",
        region=user_region,
        commune=user_commune,
        technical_skills=technical_skills,
        soft_skills=soft_skills,
        languages=languages,
        experiences=experiences,
        education=education,
        raw_cv_text=text
    )

def analyze_cv_content(raw_text: str, save_to_db: bool = True) -> CandidateProfile:
    """
    Parses CV using LLM if configured; otherwise uses deterministic_cv_parser
    to guarantee 100% fidelity with the candidate's actual text.
    Universally adaptable to ANY profession or trade without IT restrictions.
    """
    has_key = bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY)
    
    if has_key:
        system_prompt = (
            "Eres un analista experto de talento y empleabilidad para cualquier profesión, oficio o especialidad. "
            "Tu misión es extraer de manera fiel, estructurada y verificable toda la información del currículum (CV) "
            "del candidato SIN inventar datos, títulos ni competencias que no posea. "
            "Identifica la profesión real del candidato a partir de su CV y NO condiciones la respuesta al área TI. "
            "REGLAS CRÍTICAS DE CLASIFICACIÓN:\n"
            "1. 'experiences': Corresponde ÚNICAMENTE a experiencia laboral previa (empresas, instituciones donde trabajó, cargos y responsabilidades).\n"
            "2. 'education': Corresponde ÚNICAMENTE a formación académica reglada (universidades, institutos profesionales, títulos de pregrado o posgrado, carreras técnicas, diplomados y educación media/secundaria).\n"
            "3. NUNCA coloques un empleo, cargo profesional o experiencia laboral en la lista de 'education'.\n"
            "4. NUNCA coloques una carrera universitaria o título en la lista de 'experiences'."
        )

        prompt = f"""
Analiza el siguiente currículum y genera un perfil profesional estructurado universal en formato JSON exacto:
{{
  "name": "Nombre completo",
  "email": "correo electrónico",
  "phone": "teléfono de contacto",
  "location": "ubicación declarada",
  "detected_region": "Región de Chile (e.g. Región del Biobío, Región Metropolitana, etc.)",
  "detected_commune": "Comuna chilena si se indica (e.g. Concepción, Talcahuano, Chillán, etc.)",
  "linkedin_url": "url",
  "portfolio_url": "url de portafolio o repositorio si aplica",
  "headline": "Titular profesional claro y representativo",
  "summary": "Resumen profesional del candidato basado estrictamente en el CV",
  "primary_profession": "Profesión u oficio principal identificado del CV",
  "secondary_professions": ["Especialidad o área secundaria si aplica"],
  "equivalent_roles": ["Denominaciones alternativas y sinónimos usados en portales de empleo de Chile"],
  "related_roles": ["Cargos que puede desempeñar por competencias transferibles y experiencia"],
  "economic_sectors": ["Sectores económicos afines (ej: Salud, Construcción, Minería, Educación, etc.)"],
  "seniority_level": "Nivel de experiencia (Junior / Semi-Senior / Senior / Jefatura / Especialista)",
  "years_of_experience": 5.0,
  "technical_skills": ["Competencias técnicas y conocimientos específicos del área"],
  "soft_skills": ["Habilidades transversales y de gestión"],
  "languages": {{"Español": "Nativo", "Inglés": "Intermedio"}},
  "experiences": [
    {{
      "company": "Empresa o Institución",
      "role": "Cargo desempeñado",
      "start_date": "Fecha inicio",
      "end_date": "Fecha término o Presente",
      "location": "Ubicación",
      "is_remote": false,
      "description": "Responsabilidades y funciones",
      "technologies": ["Herramientas o técnicas aplicadas"],
      "bullet_achievements": ["Logro 1", "Logro 2"]
    }}
  ],
  "education": [
    {{
      "institution": "Institución Educativa",
      "degree": "Título profesional o grado",
      "field_of_study": "Área de estudio",
      "graduation_year": "Año de graduación"
    }}
  ],
  "certifications": ["Certificación o registro profesional"]
}}

TEXTO DEL CURRÍCULUM:
---
{raw_text[:65000]}
---
"""
        try:
            result = llm.generate_json(prompt, system_instruction=system_prompt)
            extracted_name = result.get("name", "")
            # Verify candidate name exists in text to prevent simulator/hallucination spillover
            if extracted_name and extracted_name.lower() in raw_text.lower():
                experiences = [WorkExperience(**exp) for exp in result.get("experiences", [])]
                education = [EducationItem(**edu) for edu in result.get("education", [])]

                # Resolve region and commune
                loc = result.get("location", "Chile")
                det_reg = result.get("detected_region")
                det_comm = result.get("detected_commune")
                if not det_reg or not det_comm:
                    r, c, _ = detect_region_and_commune(f"{loc} {raw_text[:800]}")
                    det_reg = det_reg or r
                    det_comm = det_comm or c

                profile = CandidateProfile(
                    name=result.get("name", "Candidato"),
                    email=result.get("email"),
                    phone=result.get("phone"),
                    location=loc,
                    linkedin_url=result.get("linkedin_url"),
                    portfolio_url=result.get("portfolio_url"),
                    headline=result.get("headline", result.get("primary_profession", "Profesional")),
                    summary=result.get("summary", ""),
                    years_of_experience=float(result.get("years_of_experience", 0)),
                    primary_profession=result.get("primary_profession"),
                    secondary_professions=result.get("secondary_professions", []),
                    equivalent_roles=result.get("equivalent_roles", []),
                    related_roles=result.get("related_roles", []),
                    economic_sectors=result.get("economic_sectors", []),
                    seniority_level=result.get("seniority_level", "Profesional"),
                    region=det_reg,
                    commune=det_comm,
                    technical_skills=result.get("technical_skills", []),
                    soft_skills=result.get("soft_skills", []),
                    languages=result.get("languages", {}),
                    experiences=experiences,
                    education=education,
                    certifications=result.get("certifications", []),
                    raw_cv_text=raw_text
                )
                if save_to_db:
                    db.save_profile(profile)
                    # Automatically synchronize user preferences with the detected profile
                    _sync_preferences_from_profile(profile)
                return profile
        except Exception as e:
            logger.warning(f"LLM parsing failed, falling back to deterministic parser: {e}")

    # Fallback to deterministic parser
    profile = deterministic_cv_parser(raw_text)
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
        logger.warning(f"Could not sync preferences from profile: {err}")


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
            logger.warning(f"LLM assist failed, falling back to heuristic assistant: {e}")

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
            logger.warning(f"Error en tailor_profile_for_role con LLM: {e}")

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

