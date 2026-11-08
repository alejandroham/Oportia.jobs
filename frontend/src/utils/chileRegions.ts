/**
 * Chile Regions & Communes Taxonomy for Frontend
 * Defines the 16 Chilean regions, communes, and priority detection helpers.
 */

export interface ChileRegionItem {
  id: string;
  name: string;
  shortName: string;
  communes: string[];
}

export const CHILE_REGIONS: ChileRegionItem[] = [
  {
    id: 'Región de Arica y Parinacota',
    name: 'Región de Arica y Parinacota',
    shortName: 'Arica y Parinacota',
    communes: ['Arica', 'Camarones', 'Putre', 'General Lagos']
  },
  {
    id: 'Región de Tarapacá',
    name: 'Región de Tarapacá',
    shortName: 'Tarapacá',
    communes: ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Camiña', 'Colchane', 'Huara', 'Pica']
  },
  {
    id: 'Región de Antofagasta',
    name: 'Región de Antofagasta',
    shortName: 'Antofagasta',
    communes: ['Antofagasta', 'Mejillones', 'Sierra Gorda', 'Taltal', 'Calama', 'Ollagüe', 'San Pedro de Atacama', 'Tocopilla', 'María Elena']
  },
  {
    id: 'Región de Atacama',
    name: 'Región de Atacama',
    shortName: 'Atacama',
    communes: ['Copiapó', 'Caldera', 'Tierra Amarilla', 'Chañaral', 'Diego de Almagro', 'Vallenar', 'Alto del Carmen', 'Freirina', 'Huasco']
  },
  {
    id: 'Región de Coquimbo',
    name: 'Región de Coquimbo',
    shortName: 'Coquimbo',
    communes: ['La Serena', 'Coquimbo', 'Andacollo', 'La Higuera', 'Paihuano', 'Vicuña', 'Illapel', 'Canela', 'Los Vilos', 'Salamanca', 'Ovalle', 'Combarbalá', 'Monte Patria', 'Punitaqui', 'Río Hurtado']
  },
  {
    id: 'Región de Valparaíso',
    name: 'Región de Valparaíso',
    shortName: 'Valparaíso',
    communes: ['Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana', 'Quillota', 'Calera', 'San Antonio', 'Los Andes', 'San Felipe', 'Limache', 'Casablanca', 'Puchuncaví', 'Quintero', 'Papudo', 'Zapallar', 'La Ligua']
  },
  {
    id: 'Región Metropolitana de Santiago',
    name: 'Región Metropolitana de Santiago',
    shortName: 'Metropolitana',
    communes: ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Maipú', 'Puente Alto', 'La Florida', 'San Bernardo', 'Pudahuel', 'Quilicura', 'Recoleta', 'Vitacura', 'Lo Barnechea', 'Peñalolén', 'Macul', 'Estación Central', 'Huechuraba', 'Colina', 'Lampa', 'San Miguel', 'Independencia', 'Quinta Normal', 'Renca', 'Conchalí', 'Cerrillos', 'El Bosque', 'La Cisterna', 'La Granja', 'La Pintana', 'La Reina', 'Lo Espejo', 'Lo Prado', 'Pedro Aguirre Cerda', 'San Joaquín', 'San Ramón', 'Pirque', 'San José de Maipo', 'Buin', 'Paine', 'Melipilla', 'Talagante', 'Peñaflor', 'Padre Hurtado']
  },
  {
    id: "Región del Libertador General Bernardo O'Higgins",
    name: "Región del Libertador Bernardo O'Higgins",
    shortName: "O'Higgins",
    communes: ['Rancagua', 'Machalí', 'Rengo', 'San Fernando', 'Graneros', 'Mostazal', 'San Vicente', 'Pichilemu', 'Santa Cruz', 'Chimbarongo']
  },
  {
    id: 'Región del Maule',
    name: 'Región del Maule',
    shortName: 'Maule',
    communes: ['Talca', 'Curicó', 'Linares', 'Constitución', 'San Javier', 'Parral', 'Molina', 'Cauquenes', 'San Clemente', 'Longaví']
  },
  {
    id: 'Región de Ñuble',
    name: 'Región de Ñuble',
    shortName: 'Ñuble',
    communes: ['Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes', 'Coihueco', 'Quillón', 'Yungay', 'San Nicolás']
  },
  {
    id: 'Región del Biobío',
    name: 'Región del Biobío',
    shortName: 'Biobío',
    communes: [
      'Concepción', 'Talcahuano', 'San Pedro de la Paz', 'Chiguayante', 'Hualpén',
      'Coronel', 'Lota', 'Los Ángeles', 'Penco', 'Tomé', 'Arauco', 'Cañete',
      'Cabrero', 'Curanilahue', 'Mulchén', 'Nacimiento', 'Laja', 'Lebu', 'Santa Juana', 'Yumbel'
    ]
  },
  {
    id: 'Región de La Araucanía',
    name: 'Región de La Araucanía',
    shortName: 'La Araucanía',
    communes: ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol', 'Lautaro', 'Victoria', 'Nueva Imperial', 'Collipulli', 'Traiguén']
  },
  {
    id: 'Región de Los Ríos',
    name: 'Región de Los Ríos',
    shortName: 'Los Ríos',
    communes: ['Valdivia', 'La Unión', 'Río Bueno', 'Panguipulli', 'Paillaco', 'Mariquina', 'Los Lagos', 'Lanco']
  },
  {
    id: 'Región de Los Lagos',
    name: 'Región de Los Lagos',
    shortName: 'Los Lagos',
    communes: ['Puerto Montt', 'Puerto Varas', 'Osorno', 'Castro', 'Ancud', 'Quellón', 'Frutillar', 'Llanquihue', 'Calbuco', 'Purranque']
  },
  {
    id: 'Región de Aysén del General Carlos Ibáñez del Campo',
    name: 'Región de Aysén',
    shortName: 'Aysén',
    communes: ['Coyhaique', 'Puerto Aysén', 'Chile Chico', 'Cochrane']
  },
  {
    id: 'Región de Magallanes y de la Antártica Chilena',
    name: 'Región de Magallanes',
    shortName: 'Magallanes',
    communes: ['Punta Arenas', 'Puerto Natales', 'Porvenir', 'Cabo de Hornos']
  }
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function detectJobRegionAndCommune(locationStr?: string | null): {
  region: string | null;
  commune: string | null;
  isRemote: boolean;
} {
  if (!locationStr) {
    return { region: null, commune: null, isRemote: false };
  }

  const norm = normalize(locationStr);
  const isRemote =
    norm.includes('remoto') ||
    norm.includes('teletrabajo') ||
    norm.includes('remote') ||
    norm.includes('en linea');

  // Check if header clause exists (e.g. Ubicación: ...)
  const headerMatch = locationStr.match(/(?:ubicaci[oó]n|residencia|ciudad|direcci[oó]n):\s*([^\n|]+)/i);
  const headerNorm = headerMatch ? normalize(headerMatch[1]) : null;

  // Check explicit regions in text
  const explicitRegions = new Set<string>();
  for (const reg of CHILE_REGIONS) {
    const regNorm = normalize(reg.name);
    const shortNorm = normalize(reg.shortName);
    if (new RegExp(`\\b(${regNorm}|${shortNorm})\\b`, 'i').test(norm)) {
      explicitRegions.add(reg.id);
    }
  }

  // Find matching commune with smart priority
  interface CommuneMatch {
    inHeader: number;
    inExplicitReg: number;
    pos: number;
    len: number;
    regionId: string;
    communeName: string;
  }
  const commMatches: CommuneMatch[] = [];

  for (const reg of CHILE_REGIONS) {
    for (const comm of reg.communes) {
      const commNorm = normalize(comm);
      const regex = new RegExp(`\\b${commNorm}\\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = regex.exec(norm)) !== null) {
        const inHeader = headerNorm && new RegExp(`\\b${commNorm}\\b`, 'i').test(headerNorm) ? 0 : 1;
        const inExplicitReg = explicitRegions.has(reg.id) ? 0 : 1;
        commMatches.push({
          inHeader,
          inExplicitReg,
          pos: m.index,
          len: commNorm.length,
          regionId: reg.id,
          communeName: comm
        });
      }
    }
  }

  if (commMatches.length > 0) {
    commMatches.sort((a, b) => {
      if (a.inHeader !== b.inHeader) return a.inHeader - b.inHeader;
      if (a.inExplicitReg !== b.inExplicitReg) return a.inExplicitReg - b.inExplicitReg;
      if (a.pos !== b.pos) return a.pos - b.pos;
      return b.len - a.len;
    });
    return {
      region: commMatches[0].regionId,
      commune: commMatches[0].communeName,
      isRemote
    };
  }

  // Find matching region
  for (const reg of CHILE_REGIONS) {
    const regNorm = normalize(reg.name);
    const shortNorm = normalize(reg.shortName);
    if (norm.includes(shortNorm) || norm.includes(regNorm)) {
      return { region: reg.id, commune: null, isRemote };
    }
  }

  return { region: null, commune: null, isRemote };
}

export function getGeographicBadge(
  jobLocation?: string | null,
  userRegion: string = 'Región del Biobío'
): {
  type: 'user_region' | 'other_region' | 'remote' | 'national';
  label: string;
  badgeClass: string;
  detectedRegion: string | null;
  detectedCommune: string | null;
} {
  const { region, commune, isRemote } = detectJobRegionAndCommune(jobLocation);

  if (isRemote) {
    return {
      type: 'remote',
      label: '🌍 Remoto (Chile)',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40',
      detectedRegion: region,
      detectedCommune: commune
    };
  }

  if (region && normalize(region) === normalize(userRegion)) {
    const locText = commune ? `${commune} • Mi Región` : '📍 En mi región';
    return {
      type: 'user_region',
      label: `📍 ${locText}`,
      badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 font-bold shadow-2xs',
      detectedRegion: region,
      detectedCommune: commune
    };
  }

  if (region) {
    const shortName = CHILE_REGIONS.find(r => normalize(r.id) === normalize(region))?.shortName || region;
    const locText = commune ? `${commune}, ${shortName}` : shortName;
    return {
      type: 'other_region',
      label: `🇨🇱 ${locText}`,
      badgeClass: 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700',
      detectedRegion: region,
      detectedCommune: commune
    };
  }

  return {
    type: 'national',
    label: '🇨🇱 Chile',
    badgeClass: 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700',
    detectedRegion: null,
    detectedCommune: null
  };
}
