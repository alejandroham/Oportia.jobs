"""
Chilean Regions and Communes Taxonomy & Geographic Matching
============================================================
Definición oficial de las 16 regiones de Chile y sus comunas.
Permite clasificar cualquier ubicación de oferta laboral, detectar si
corresponde a la región de residencia del usuario y calcular la prioridad
geográfica sin descartar la cobertura nacional.
"""

import re
import unicodedata
from typing import Dict, List, Optional, Tuple, Set, Any

# Diccionario oficial de regiones y sus comunas asociadas
CHILE_REGIONS: Dict[str, Dict[str, Any]] = {
    "Región de Arica y Parinacota": {
        "short_name": "Arica y Parinacota",
        "aliases": ["arica y parinacota", "arica", "xv", "xv region", "15 region", "region de arica"],
        "communes": ["Arica", "Camarones", "Putre", "General Lagos"]
    },
    "Región de Tarapacá": {
        "short_name": "Tarapacá",
        "aliases": ["tarapaca", "tarapacá", "i region", "1 region", "primera region"],
        "communes": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"]
    },
    "Región de Antofagasta": {
        "short_name": "Antofagasta",
        "aliases": ["antofagasta", "ii region", "2 region", "segunda region"],
        "communes": ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal", "Calama", "Ollagüe", "San Pedro de Atacama", "Tocopilla", "María Elena"]
    },
    "Región de Atacama": {
        "short_name": "Atacama",
        "aliases": ["atacama", "iii region", "3 region", "tercera region"],
        "communes": ["Copiapó", "Caldera", "Tierra Amarilla", "Chañaral", "Diego de Almagro", "Vallenar", "Alto del Carmen", "Freirina", "Huasco"]
    },
    "Región de Coquimbo": {
        "short_name": "Coquimbo",
        "aliases": ["coquimbo", "la serena", "iv region", "4 region", "cuarta region"],
        "communes": ["La Serena", "Coquimbo", "Andacollo", "La Higuera", "Paiguano", "Paihuano", "Vicuña", "Illapel", "Canela", "Los Vilos", "Salamanca", "Ovalle", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado"]
    },
    "Región de Valparaíso": {
        "short_name": "Valparaíso",
        "aliases": ["valparaiso", "valparaíso", "v region", "5 region", "quinta region", "viña del mar", "vina del mar"],
        "communes": ["Valparaíso", "Casablanca", "Concón", "Juan Fernández", "Puchuncaví", "Quintero", "Viña del Mar", "Isla de Pascua", "Los Andes", "Calle Larga", "Rinconada", "San Esteban", "La Ligua", "Cabildo", "Papudo", "Petorca", "Zapallar", "Quillota", "Calera", "Hijuelas", "La Cruz", "Nogales", "San Antonio", "Algarrobo", "Cartagena", "El Quisco", "El Tabo", "Santo Domingo", "San Felipe", "Catemu", "Llaillay", "Panquehue", "Putaendo", "Santa María", "Quilpué", "Limache", "Olmué", "Villa Alemana"]
    },
    "Región Metropolitana de Santiago": {
        "short_name": "Metropolitana",
        "aliases": ["metropolitana", "rm", "santiago", "region metropolitana", "stgo", "metropolitana de santiago", "santiago de chile"],
        "communes": ["Santiago", "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central", "Huechuraba", "Independencia", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Joaquín", "San Miguel", "San Ramón", "Vitacura", "Puente Alto", "Pirque", "San José de Maipo", "Colina", "Lampa", "Tiltil", "San Bernardo", "Buin", "Calera de Tango", "Paine", "Melipilla", "Alhué", "Curacaví", "María Pinto", "San Pedro", "Talagante", "El Monte", "Isla de Maipo", "Padre Hurtado", "Peñaflor"]
    },
    "Región del Libertador General Bernardo O'Higgins": {
        "short_name": "O'Higgins",
        "aliases": ["o'higgins", "ohiggins", "rancagua", "vi region", "6 region", "sexta region"],
        "communes": ["Rancagua", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "Las Cabras", "Machalí", "Malloa", "Mostazal", "Olivar", "Peumo", "Pichidegua", "Quinta de Tilcoco", "Rengo", "Requínoa", "San Vicente", "Pichilemu", "La Estrella", "Litueche", "Marchihue", "Navidad", "Paredones", "San Fernando", "Chépica", "Chimbarongo", "Lolol", "Nancagua", "Palmilla", "Peralillo", "Placilla", "Pumanque", "Santa Cruz"]
    },
    "Región del Maule": {
        "short_name": "Maule",
        "aliases": ["maule", "talca", "vii region", "7 region", "septima region"],
        "communes": ["Talca", "Constitución", "Curepto", "Empedrado", "Maule", "Pelarco", "Pencahue", "Río Claro", "San Clemente", "San Rafael", "Cauquenes", "Chanco", "Pelluhue", "Curicó", "Hualañé", "Licantén", "Molina", "Rauco", "Romeral", "Sagrada Familia", "Teno", "Vichuquén", "Linares", "Colbún", "Longaví", "Parral", "Retiro", "San Javier", "Villa Alegre", "Yerbas Buenas"]
    },
    "Región de Ñuble": {
        "short_name": "Ñuble",
        "aliases": ["ñuble", "nuble", "chillan", "chillán", "xvi region", "16 region"],
        "communes": ["Chillán", "Bulnes", "Chillán Viejo", "El Carmen", "Pemuco", "Pinto", "Quillón", "San Ignacio", "Yungay", "Cobquecura", "Coelemu", "Ninhue", "Portezuelo", "Ránquil", "Treguaco", "San Carlos", "Coihueco", "Ñiquén", "San Fabián", "San Nicolás"]
    },
    "Región del Biobío": {
        "short_name": "Biobío",
        "aliases": ["biobio", "biobío", "concepcion", "concepción", "viii region", "8 region", "octava region", "gran concepcion", "talcahuano", "los angeles"],
        "communes": [
            "Concepción", "Coronel", "Chiguayante", "Florida", "Hualqui", "Lota",
            "Penco", "San Pedro de la Paz", "Santa Juana", "Talcahuano", "Tomé", "Hualpén",
            "Lebu", "Arauco", "Cañete", "Contulmo", "Curanilahue", "Los Álamos", "Tirúa",
            "Los Ángeles", "Antuco", "Cabrero", "Laja", "Mulchén", "Nacimiento", "Negrete",
            "Quilaco", "Quilleco", "San Rosendo", "Santa Bárbara", "Tucapel", "Yumbel", "Alto Biobío"
        ]
    },
    "Región de La Araucanía": {
        "short_name": "La Araucanía",
        "aliases": ["araucania", "araucanía", "temuco", "ix region", "9 region", "novena region"],
        "communes": ["Temuco", "Carahue", "Cunco", "Curarrehue", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Melipeuco", "Nueva Imperial", "Padre Las Casas", "Perquenco", "Pitrufquén", "Pucón", "Saavedra", "Teodoro Schmidt", "Toltén", "Vilcún", "Villarrica", "Cholchol", "Angol", "Collipulli", "Curacautín", "Ercilla", "Lonquimay", "Los Sauces", "Lumaco", "Purén", "Renaico", "Traiguén", "Victoria"]
    },
    "Región de Los Ríos": {
        "short_name": "Los Ríos",
        "aliases": ["los rios", "los ríos", "valdivia", "xiv region", "14 region"],
        "communes": ["Valdivia", "Corral", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "La Unión", "Futrono", "Lago Ranco", "Río Bueno"]
    },
    "Región de Los Lagos": {
        "short_name": "Los Lagos",
        "aliases": ["los lagos", "puerto montt", "osorno", "chiloe", "chiloé", "x region", "10 region", "decima region"],
        "communes": ["Puerto Montt", "Calbuco", "Cochamó", "Fresia", "Frutillar", "Los Muermos", "Llanquihue", "Maullín", "Puerto Varas", "Castro", "Ancud", "Chonchi", "Curaco de Vélez", "Dalcahue", "Puqueldón", "Queilén", "Quellón", "Quemchi", "Quinchao", "Osorno", "Puerto Octay", "Purranque", "Puyehue", "Río Negro", "San Juan de la Costa", "San Pablo", "Chaitén", "Futaleufú", "Hualaihué", "Palena"]
    },
    "Región de Aysén del General Carlos Ibáñez del Campo": {
        "short_name": "Aysén",
        "aliases": ["aysen", "aysén", "coyhaique", "coihaique", "xi region", "11 region", "undecima region"],
        "communes": ["Coyhaique", "Lago Verde", "Aysén", "Cisnes", "Guaitecas", "Cochrane", "O'Higgins", "Tortel", "Chile Chico", "Río Ibáñez"]
    },
    "Región de Magallanes y de la Antártica Chilena": {
        "short_name": "Magallanes",
        "aliases": ["magallanes", "punta arenas", "xii region", "12 region", "duodecima region"],
        "communes": ["Punta Arenas", "Laguna Blanca", "Río Verde", "San Gregorio", "Cabo de Hornos", "Antártica", "Porvenir", "Primavera", "Timaukel", "Natales", "Torres del Paine"]
    }
}

def _strip_accents(text: str) -> str:
    """Normalize and strip accents for robust matching."""
    text = unicodedata.normalize('NFD', text)
    return ''.join(c for c in text if unicodedata.category(c) != 'Mn').lower().strip()

# Build fast lookup indexes
_COMMUNE_TO_REGION: Dict[str, Tuple[str, str]] = {}
for reg_name, reg_data in CHILE_REGIONS.items():
    for comm in reg_data["communes"]:
        _COMMUNE_TO_REGION[_strip_accents(comm)] = (reg_name, comm)

_ALIAS_TO_REGION: Dict[str, str] = {}
for reg_name, reg_data in CHILE_REGIONS.items():
    _ALIAS_TO_REGION[_strip_accents(reg_name)] = reg_name
    _ALIAS_TO_REGION[_strip_accents(reg_data["short_name"])] = reg_name
    for alias in reg_data["aliases"]:
        _ALIAS_TO_REGION[_strip_accents(alias)] = reg_name


def detect_region_and_commune(location_str: Optional[str]) -> Tuple[Optional[str], Optional[str], bool]:
    """
    Identifies the Chilean region, commune, and remote status from any free-text location string.
    Returns: (region_name, commune_name, is_remote)
    """
    if not location_str:
        return (None, None, False)

    norm_loc = _strip_accents(location_str)

    # 1. Check if remote
    is_remote = any(k in norm_loc for k in ["remoto", "teletrabajo", "remote", "en linea", "desde casa", "home office"])

    # If full CV or multiline text is provided, extract explicit location line if present
    loc_header_match = re.search(r'(?:ubicaci[oó]n|residencia|ciudad|direcci[oó]n):\s*([^\n|]+)', location_str, re.I)
    header_norm = _strip_accents(loc_header_match.group(1)) if loc_header_match else None

    # 2. Check for explicit region mentions across text
    explicit_regions = set()
    for alias_norm, reg_official in sorted(_ALIAS_TO_REGION.items(), key=lambda x: len(x[0]), reverse=True):
        pattern = r'\b' + re.escape(alias_norm) + r'\b'
        if re.search(pattern, norm_loc):
            explicit_regions.add(reg_official)

    detected_commune: Optional[str] = None
    detected_region: Optional[str] = None

    # 3. Check for commune match
    # Scoring criteria for candidates:
    # (in_header_clause: 0 or 1, in_explicit_region: 0 or 1, start_position, -name_length)
    comm_matches = []
    for comm_norm, (reg, comm_official) in sorted(_COMMUNE_TO_REGION.items(), key=lambda x: len(x[0]), reverse=True):
        pattern = r'\b' + re.escape(comm_norm) + r'\b'
        for m in re.finditer(pattern, norm_loc):
            in_header = 0 if header_norm and re.search(pattern, header_norm) else 1
            in_explicit_reg = 0 if reg in explicit_regions else 1
            comm_matches.append((in_header, in_explicit_reg, m.start(), -len(comm_norm), reg, comm_official))

    if comm_matches:
        comm_matches.sort(key=lambda x: (x[0], x[1], x[2], x[3]))
        detected_region = comm_matches[0][4]
        detected_commune = comm_matches[0][5]

    # 4. If no region found from commune, check for region aliases
    if not detected_region:
        reg_matches = []
        for alias_norm, reg_official in sorted(_ALIAS_TO_REGION.items(), key=lambda x: len(x[0]), reverse=True):
            pattern = r'\b' + re.escape(alias_norm) + r'\b'
            for m in re.finditer(pattern, norm_loc):
                in_header = 0 if header_norm and re.search(pattern, header_norm) else 1
                reg_matches.append((in_header, m.start(), -len(alias_norm), reg_official))

        if reg_matches:
            reg_matches.sort(key=lambda x: (x[0], x[1], x[2]))
            detected_region = reg_matches[0][3]

    return (detected_region, detected_commune, is_remote)


def calculate_geographic_priority(
    job_location: Optional[str],
    user_region: Optional[str] = None,
    user_commune: Optional[Any] = None
) -> Tuple[str, int, Optional[str], Optional[str]]:
    """
    Computes visual geographic category and priority ranking boost for a job.
    
    Returns:
      (category, boost_points, detected_region, detected_commune)
      category: "user_region" | "other_region" | "remote" | "national"
    """
    job_region, job_commune, is_remote = detect_region_and_commune(job_location)

    if is_remote:
        return ("remote", 5, job_region, job_commune)

    if user_region and job_region:
        norm_user_reg = _strip_accents(user_region)
        norm_job_reg = _strip_accents(job_region)
        if norm_user_reg == norm_job_reg:
            # Matches user's region!
            boost = 15
            # Extra boost if it matches user's specific commune
            if user_commune and job_commune:
                comm_list = [user_commune] if isinstance(user_commune, str) else list(user_commune)
                norm_job_comm = _strip_accents(job_commune)
                if any(_strip_accents(c) == norm_job_comm for c in comm_list if c):
                    boost = 20
            return ("user_region", boost, job_region, job_commune)

    if job_region:
        return ("other_region", 0, job_region, job_commune)

    return ("national", 0, job_region, job_commune)


def get_all_regions_list() -> List[Dict[str, Any]]:
    """Returns structured list of all 16 regions with communes for frontend selectors."""
    return [
        {
            "id": reg_name,
            "name": reg_name,
            "short_name": data["short_name"],
            "communes": data["communes"]
        }
        for reg_name, data in CHILE_REGIONS.items()
    ]
