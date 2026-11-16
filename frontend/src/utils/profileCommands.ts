import type { CandidateProfile, EducationItem, ProfileLink, UserPreferences } from '../types';
import { normalizeText } from './searchText';
import { getProfileLinks } from './profileKeywords';

/**
 * Cambios al perfil pedidos en el chat con Opi ("agrega Excel a mis habilidades",
 * "tengo un diplomado en gestión", "hablo inglés intermedio", "mi linkedin es …").
 * Se detectan sin IA (no gastan cupo) y SIEMPRE se muestran para confirmar antes de guardar.
 */
export type ProfileChange =
  | { kind: 'skills'; values: string[] }
  | { kind: 'soft_skills'; values: string[] }
  | { kind: 'keywords'; values: string[] }
  | { kind: 'certifications'; values: string[] }
  | { kind: 'education'; item: EducationItem }
  | { kind: 'language'; language: string; level: string }
  | { kind: 'link'; link: ProfileLink }
  | { kind: 'profession'; value: string }
  // "Qué busco" y "Mis logros" (se guardan en tus preferencias)
  | { kind: 'target_role'; action: 'add' | 'remove'; value: string }
  | { kind: 'achievement'; text: string };

const PREF_KINDS = new Set(['target_role', 'achievement']);
export const isPreferenceChange = (c: ProfileChange) => PREF_KINDS.has(c.kind);

const splitList = (raw: string) =>
  raw
    .split(/,|;|\s+y\s+|\s+e\s+/i)
    .map((s) => s.trim().replace(/^(el|la|los|las|un|una)\s+/i, '').replace(/[.!¡¿?"“”]+$/g, '').trim())
    .filter((s) => s.length > 1);

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const LEVELS: Record<string, string> = {
  basico: 'Básico',
  'nivel basico': 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  fluido: 'Avanzado',
  nativo: 'Nativo',
  'lengua materna': 'Nativo'
};

const LINK_SITES: Array<[RegExp, string]> = [
  [/linkedin/, 'LinkedIn'],
  [/github/, 'GitHub'],
  [/behance/, 'Behance'],
  [/portafolio|portfolio/, 'Portafolio'],
  [/sitio|pagina|web/, 'Sitio web']
];

const EDU_WORDS = /(titulo|magister|master|maestria|doctorado|licenciatura|postitulo|carrera|tecnico de nivel superior|tecnico profesional|ingenieria|pregrado|bachillerato)/;
const CERT_WORDS = /(diplomado|curso|certificacion|certificado|capacitacion|licencia de conducir|licencia clase)/;

export function parseProfileCommand(message: string): ProfileChange[] {
  const original = (message || '').trim();
  const t = normalizeText(original);
  const changes: ProfileChange[] = [];

  // Enlaces: "mi linkedin es https://…", "agrega mi portafolio https://…"
  const urlMatch = original.match(/https?:\/\/[^\s,]+|(?:www\.)?(?:linkedin|github|behance)\.com\/[^\s,]+/i);
  if (urlMatch && /(mi |agrega|anade|añade|link|enlace|perfil)/i.test(t)) {
    const url = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
    const label = LINK_SITES.find(([re]) => re.test(normalizeText(url)) || re.test(t))?.[1] || 'Sitio web';
    changes.push({ kind: 'link', link: { label, url: url.replace(/[.)]+$/, '') } });
    return changes;
  }

  // Logros: "agrega un logro: entregué la obra antes del plazo", "logré reducir mermas en 10%"
  const ach = original.match(/^\s*(?:agrega|agregar|añade|anade|anota|registra|guarda)\s+(?:un|este|el|como)?\s*logro\s*[:,\-–]?\s*(.{10,})$/i) ||
    original.match(/^\s*logr[eé]\s+(.{10,})$/i);
  if (ach) {
    changes.push({ kind: 'achievement', text: cap(ach[1].trim().replace(/[.!]+$/, '')) });
    return changes;
  }

  // Qué busco: "agrega jefe de obra a lo que busco", "busco trabajo de supervisor de obra", "ya no busco capataz"
  const roleRemove = t.match(/(?:quita|quitar|elimina|eliminar|saca|sacar|borra|borrar)\s+(.+?)\s+de\s+(?:lo que busco|que busco|mis cargos|los cargos que busco|mis busquedas)/) ||
    t.match(/ya no (?:busco|quiero)\s+(?:trabajo|empleo|pega)?\s*(?:de|como)?\s*(.+)/);
  if (roleRemove) {
    const start = t.indexOf(roleRemove[1]);
    changes.push({ kind: 'target_role', action: 'remove', value: cap(original.slice(start, start + roleRemove[1].length).trim().replace(/[.!¡¿?]+$/, '')) });
    return changes;
  }
  const roleAdd = t.match(/(?:agrega|agregar|anade|añade|suma|incluye|pon)\s+(.+?)\s+(?:a|en)\s+(?:lo que busco|que busco|mis cargos|los cargos que busco|mis busquedas)/) ||
    t.match(/^\s*(?:tambien\s+)?(?:busco|quiero)\s+(?:trabajo|empleo|pega|un trabajo)\s+(?:de|como)\s+(.+)/) ||
    t.match(/^\s*(?:tambien\s+)?me interesa(?:n)?\s+(?:cargos? de|trabajar como|trabajos? de)\s+(.+)/);
  if (roleAdd) {
    const start = t.indexOf(roleAdd[1]);
    const values = splitList(original.slice(start, start + roleAdd[1].length)).map(cap);
    values.forEach((value) => changes.push({ kind: 'target_role', action: 'add', value }));
    return changes;
  }

  // Habilidades / palabras clave: "agrega X, Y a mis habilidades"
  const add = t.match(/(?:agrega|agregar|anade|añade|suma|incluye|anota|pon)\s+(.+?)\s+(?:a|en|como)\s+mis\s+(habilidades blandas|habilidades tecnicas|habilidades|competencias|palabras clave|tecnologias|certificaciones|cursos)/);
  if (add) {
    const start = t.indexOf(add[1]);
    const values = splitList(original.slice(start, start + add[1].length)).map(cap);
    const target = add[2];
    if (values.length) {
      if (target === 'habilidades blandas') changes.push({ kind: 'soft_skills', values });
      else if (target === 'palabras clave' || target === 'tecnologias') changes.push({ kind: 'keywords', values });
      else if (target === 'certificaciones' || target === 'cursos') changes.push({ kind: 'certifications', values });
      else changes.push({ kind: 'skills', values });
    }
    return changes;
  }

  // Idiomas: "hablo inglés intermedio", "tengo inglés nivel avanzado"
  const lang = t.match(/(?:hablo|manejo|tengo|domino)\s+(?:el\s+)?(ingles|frances|portugues|aleman|italiano|chino|mandarin|japones|coreano|espanol|mapudungun|lengua de senas)(?:\s+(?:a\s+)?(?:nivel\s+)?(basico|intermedio|avanzado|fluido|nativo))?/);
  if (lang) {
    const names: Record<string, string> = { ingles: 'Inglés', frances: 'Francés', portugues: 'Portugués', aleman: 'Alemán', espanol: 'Español', japones: 'Japonés', mandarin: 'Mandarín', 'lengua de senas': 'Lengua de señas' };
    changes.push({ kind: 'language', language: names[lang[1]] || cap(lang[1]), level: LEVELS[lang[2] || 'intermedio'] || 'Intermedio' });
    return changes;
  }

  // Títulos y certificaciones: "tengo un diplomado en Gestión en Salud de la U. de Chile",
  // "terminé un curso de Excel avanzado", "me titulé de Técnico en Enfermería en el IP X"
  const study = t.match(/(?:tengo|obtuve|termine|hice|saque|curse|aprobe|me titule de|me titule como|soy)\s+(?:un|una|el|la)?\s*((?:diplomado|curso|certificacion|certificado|capacitacion|titulo|magister|master|maestria|doctorado|licenciatura|postitulo|tecnico de nivel superior|licencia)[^.!?]*)/);
  if (study) {
    const start = t.indexOf(study[1]);
    const phrase = original.slice(start, start + study[1].length).trim().replace(/[.!¡¿?]+$/, '');
    const inst = phrase.match(/\s+(?:de la|del|en la|en el)\s+((?:universidad|instituto|ip|cft|u\.|duoc|inacap|otec|sence)[^,]*)$/i);
    const main = inst ? phrase.slice(0, inst.index).trim() : phrase;
    const nphrase = normalizeText(main);
    if (CERT_WORDS.test(nphrase) && !EDU_WORDS.test(nphrase)) {
      changes.push({ kind: 'certifications', values: [cap(main)] });
    } else if (EDU_WORDS.test(nphrase)) {
      const m = main.match(/^(.+?)\s+(?:en|de)\s+(.+)$/i);
      changes.push({
        kind: 'education',
        item: { degree: cap(m ? m[1] : main), field_of_study: m ? cap(m[2]) : '', institution: inst ? cap(inst[1]) : '', graduation_year: '' }
      });
    }
    return changes;
  }

  // Profesión adicional: "también soy técnico en administración", "además trabajo como guardia"
  const prof = t.match(/(?:tambien soy|ademas soy|tambien trabajo como|ademas trabajo como)\s+(?:un|una)?\s*([^.,!?]+)/);
  if (prof) {
    const start = t.indexOf(prof[1]);
    changes.push({ kind: 'profession', value: cap(original.slice(start, start + prof[1].length).trim()) });
  }
  return changes;
}

/** Texto para confirmar el cambio en el chat. */
export function describeChange(c: ProfileChange): string {
  switch (c.kind) {
    case 'skills':
      return `Agregar a tus habilidades técnicas: ${c.values.join(', ')}`;
    case 'soft_skills':
      return `Agregar a tus habilidades blandas: ${c.values.join(', ')}`;
    case 'keywords':
      return `Agregar a tus palabras clave: ${c.values.join(', ')}`;
    case 'certifications':
      return `Agregar a tus certificaciones y cursos: ${c.values.join(', ')}`;
    case 'education':
      return `Agregar el título: ${[c.item.degree, c.item.field_of_study].filter(Boolean).join(' en ')}${c.item.institution ? ` (${c.item.institution})` : ''}`;
    case 'language':
      return `Agregar idioma: ${c.language} (${c.level})`;
    case 'link':
      return `Agregar enlace de ${c.link.label}: ${c.link.url}`;
    case 'profession':
      return `Agregar profesión u oficio: ${c.value}`;
    case 'target_role':
      return c.action === 'add' ? `Agregar a lo que buscas: ${c.value}` : `Quitar de lo que buscas: ${c.value}`;
    case 'achievement':
      return `Agregar a Mis logros: ${c.text}`;
  }
}

const mergeUnique = (base: string[] = [], extra: string[]) => {
  const seen = new Set(base.map((b) => normalizeText(b)));
  return [...base, ...extra.filter((e) => !seen.has(normalizeText(e)))];
};

/** Aplica los cambios confirmados al perfil (sin duplicar). */
export function applyProfileChanges(profile: CandidateProfile, changes: ProfileChange[]): CandidateProfile {
  let p: CandidateProfile = { ...profile };
  for (const c of changes) {
    if (c.kind === 'skills') p = { ...p, technical_skills: mergeUnique(p.technical_skills, c.values) };
    if (c.kind === 'soft_skills') p = { ...p, soft_skills: mergeUnique(p.soft_skills, c.values) };
    if (c.kind === 'keywords') p = { ...p, keywords: mergeUnique(p.keywords, c.values) };
    if (c.kind === 'certifications') p = { ...p, certifications: mergeUnique(p.certifications, c.values) };
    if (c.kind === 'profession') p = { ...p, secondary_professions: mergeUnique(p.secondary_professions, [c.value]) };
    if (c.kind === 'language') p = { ...p, languages: { ...(p.languages || {}), [c.language]: c.level } };
    if (c.kind === 'education') p = { ...p, education: [...(p.education || []), c.item] };
    if (c.kind === 'link') {
      const links = getProfileLinks(p);
      if (!links.some((l) => normalizeText(l.url) === normalizeText(c.link.url))) links.push(c.link);
      p = { ...p, links, linkedin_url: c.link.label === 'LinkedIn' ? c.link.url : p.linkedin_url };
    }
  }
  return { ...p, updated_at: new Date().toISOString() };
}

/** Aplica a tus preferencias los cambios de "Qué busco" y "Mis logros" confirmados en el chat. */
export function applyPreferenceChanges(prefs: UserPreferences, changes: ProfileChange[]): UserPreferences {
  let p: UserPreferences = { ...prefs, target_roles: [...(prefs.target_roles || [])] };
  for (const c of changes) {
    if (c.kind === 'target_role') {
      const has = p.target_roles.some((r) => normalizeText(r) === normalizeText(c.value));
      if (c.action === 'add' && !has) p.target_roles.push(c.value);
      if (c.action === 'remove') p.target_roles = p.target_roles.filter((r) => normalizeText(r) !== normalizeText(c.value));
    }
    if (c.kind === 'achievement') {
      const story = {
        id: 'star_' + Date.now() + Math.random().toString(36).slice(2, 6),
        title: c.text.length > 70 ? c.text.slice(0, 67) + '…' : c.text,
        situation_and_task: '',
        action: c.text,
        result_and_metrics: '',
        key_skills: [],
        source: 'opi',
        created_at: new Date().toISOString()
      };
      p = { ...p, learned_star_stories: [story, ...(p.learned_star_stories || [])] };
    }
  }
  return { ...p, updated_at: new Date().toISOString() };
}

