import type { CandidateProfile, ProfileLink } from '../types';
import { matchesQuery, normalizeText } from './searchText';

/**
 * "Tecnologías y palabras clave" sugeridas según el área del perfil.
 * Se detecta el área con la profesión, el titular, los cargos y los títulos del CV.
 */
interface Area {
  name: string;
  detect: RegExp;
  keywords: string[];
}

export const KEYWORD_AREAS: Area[] = [
  {
    name: 'Informática y soporte TI',
    detect: /informat|soporte (ti|tecnico)|\bti\b|sistemas|redes|desarroll|program|software|ciberseg|mesa de ayuda|help ?desk/,
    keywords: ['Soporte TI', 'Mesa de ayuda', 'Redes', 'Windows Server', 'Microsoft 365', 'Active Directory', 'Ciberseguridad', 'Hardware', 'ITIL', 'SQL', 'Linux', 'Virtualización']
  },
  {
    name: 'Salud',
    detect: /enferm|\btens\b|paramedic|salud|clinic|hospital|cesfam|kinesi|matron|medic|farmac|odont/,
    keywords: ['TENS', 'Signos vitales', 'Curaciones', 'Administración de medicamentos', 'IAAS', 'Registro clínico', 'Urgencia', 'Atención de pacientes', 'Primeros auxilios', 'RCP']
  },
  {
    name: 'Educación',
    detect: /docent|profesor|educador|parvul|pedagog|colegio|liceo|jardin infantil|relator|capacitador/,
    keywords: ['Planificación curricular', 'Evaluación de aprendizajes', 'Educación diferencial', 'Convivencia escolar', 'Bases Curriculares', 'Inclusión', 'Aula', 'Primera infancia']
  },
  {
    name: 'Comercio, ventas y atención',
    detect: /vend|ventas|comercial|retail|tienda|cajer|atencion (al )?cliente|ejecutiv[oa] de (ventas|cuentas)|call center/,
    keywords: ['Ventas', 'Atención al cliente', 'Caja', 'Metas comerciales', 'CRM', 'Postventa', 'Retail', 'Negociación', 'Fidelización']
  },
  {
    name: 'Logística y bodega',
    detect: /bodeg|logistic|almacen|inventari|despacho|abastecim|supply|grua horquilla|operador/,
    keywords: ['Control de inventario', 'Bodega', 'Despacho', 'Recepción de mercadería', 'Grúa horquilla', 'WMS', 'SAP', 'Picking', 'Cadena de suministro']
  },
  {
    name: 'Administración y finanzas',
    detect: /contab|contador|finanz|administrativ|tesorer|remuner|auditor|ingenier[oa] comercial|rrhh|recursos humanos/,
    keywords: ['Excel avanzado', 'Contabilidad', 'Remuneraciones', 'Conciliaciones bancarias', 'SII', 'ERP', 'Facturación', 'Presupuesto', 'Gestión de personas']
  },
  {
    name: 'Construcción y mantención',
    detect: /construc|obra|arquitect|electric|mantencion|mantenimiento|soldad|gasfiter|prevencion de riesgos|terreno/,
    keywords: ['Lectura de planos', 'AutoCAD', 'Prevención de riesgos', 'Mantención', 'Electricidad', 'Supervisión de obra', 'Control de calidad', 'Seguridad laboral']
  },
  {
    name: 'Gastronomía y turismo',
    detect: /cocin|chef|garzon|mesero|gastronom|hotel|turism|barista|bartender/,
    keywords: ['Manipulación de alimentos', 'Cocina', 'Servicio a la mesa', 'Inocuidad alimentaria', 'Atención de huéspedes', 'Inventario de cocina']
  },
  {
    name: 'Sector público y social',
    detect: /municip|servicio publico|trabajador social|asistente social|psicolog|proteccion|programa social|fiscaliz/,
    keywords: ['Gestión pública', 'Ley de Transparencia', 'Atención de público', 'Intervención social', 'Redes de apoyo', 'Compras públicas', 'Probidad']
  }
];

export function detectProfileAreas(profile: CandidateProfile | null | undefined): Area[] {
  if (!profile) return [];
  const text = normalizeText(
    [
      profile.primary_profession,
      ...(profile.secondary_professions || []),
      profile.headline,
      ...(profile.experiences || []).map((e) => `${e.role} ${e.description}`),
      ...(profile.education || []).map((e) => `${e.degree} ${e.field_of_study}`)
    ]
      .filter(Boolean)
      .join(' ')
  );
  return KEYWORD_AREAS.filter((a) => a.detect.test(text));
}

/** Palabras clave sugeridas (las que ya están en el perfil no se repiten). */
export function suggestKeywords(profile: CandidateProfile | null | undefined): string[] {
  const have = new Set(
    [...(profile?.keywords || []), ...(profile?.technical_skills || [])].map((k) => normalizeText(k))
  );
  const out: string[] = [];
  for (const area of detectProfileAreas(profile)) {
    for (const k of area.keywords) {
      if (!have.has(normalizeText(k)) && !out.includes(k)) out.push(k);
    }
  }
  return out;
}

/** Texto completo del CV (para ver qué palabras clave aparecen de verdad). */
export function profileText(profile: CandidateProfile | null | undefined): string {
  if (!profile) return '';
  return [
    profile.headline,
    profile.summary,
    profile.primary_profession,
    ...(profile.secondary_professions || []),
    ...(profile.technical_skills || []),
    ...(profile.certifications || []),
    ...(profile.experiences || []).map((e) => [e.role, e.description, ...(e.bullet_achievements || []), ...(e.technologies || [])].join(' ')),
    ...(profile.education || []).map((e) => `${e.degree} ${e.field_of_study}`)
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Al subir el CV: agrega a "Tecnologías y palabras clave" las sugeridas de su área que
 * APARECEN en el CV (máximo 12). Las demás quedan como sugerencias para que la persona elija.
 */
export function withDetectedKeywords(profile: CandidateProfile): CandidateProfile {
  const text = profileText(profile);
  const found = suggestKeywords(profile).filter((k) => matchesQuery(text, k));
  if (!found.length) return profile;
  const current = profile.keywords || [];
  return { ...profile, keywords: [...current, ...found].slice(0, Math.max(current.length, 12)) };
}

/** Términos del perfil para buscar y ordenar ofertas: palabras clave, profesiones y habilidades técnicas. */
export function profileSearchTerms(profile: CandidateProfile | null | undefined, max = 15): string[] {
  if (!profile) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [
    ...(profile.keywords || []),
    profile.primary_profession || '',
    ...(profile.secondary_professions || []),
    ...(profile.technical_skills || [])
  ]) {
    const n = normalizeText(t).trim();
    if (n.length < 2 || seen.has(n)) continue;
    seen.add(n);
    out.push(t.trim());
    if (out.length >= max) break;
  }
  return out;
}

/** Enlaces del perfil, incluyendo los campos antiguos (LinkedIn, GitHub, portafolio). */
export function getProfileLinks(profile: CandidateProfile | null | undefined): ProfileLink[] {
  if (!profile) return [];
  const links = [...(profile.links || [])];
  const has = (url?: string) => !!url && links.some((l) => normalizeText(l.url).replace(/\/$/, '') === normalizeText(url).replace(/\/$/, ''));
  if (profile.linkedin_url && !has(profile.linkedin_url)) links.unshift({ label: 'LinkedIn', url: profile.linkedin_url });
  if (profile.github_url && !has(profile.github_url)) links.push({ label: 'GitHub', url: profile.github_url });
  if (profile.portfolio_url && !has(profile.portfolio_url)) links.push({ label: 'Portafolio', url: profile.portfolio_url });
  return links;
}
