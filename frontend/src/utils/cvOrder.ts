import type { CandidateProfile, EducationItem, WorkExperience } from '../types';

/**
 * Orden cronológico del CV: lo más reciente primero (como lo esperan los reclutadores en Chile).
 * - Experiencia: primero los trabajos actuales; luego por fecha de término y, si empata, por fecha de inicio.
 * - Educación: primero lo que está "en curso"; luego por año de egreso.
 * - Las fechas que no se entienden quedan al final, en el orden en que estaban.
 * Si la persona ordena a mano (flechas), el perfil queda en `cv_order: 'manual'` y no se reordena solo.
 */

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8,
  sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12
};
const CURRENT = /\b(actual|actualidad|presente|present|current|a la fecha|hoy|en curso|cursando|vigente)\b/i;
export const CURRENT_KEY = 999_999;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Todas las fechas de un texto como claves año*100+mes (mes 0 si solo hay año). */
function dateKeys(text: string): number[] {
  const t = norm(text || '');
  const keys: number[] = [];
  const re = /(?:\b(\d{1,2})\s*[/.-]\s*)?((?:19|20)\d{2})(?:[/.-](\d{1,2})(?!\d))?|([a-z]{3})[a-z]*\.?\s*(?:de(?:l)?\s+)?((?:19|20)\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m[2]) {
      const month = Number(m[1] || m[3] || 0);
      keys.push(Number(m[2]) * 100 + (month >= 1 && month <= 12 ? month : 0));
    } else if (m[5]) {
      keys.push(Number(m[5]) * 100 + (MONTHS[m[4]] || 0));
    }
  }
  return keys;
}

/** Clave de orden de una experiencia: [término, inicio] (más grande = más reciente). */
export function experienceKey(exp: Pick<WorkExperience, 'start_date' | 'end_date'>): [number, number] | null {
  const startKeys = dateKeys(exp.start_date || '');
  const endText = exp.end_date || '';
  // A veces el período completo viene en "Desde" ("2019 – 2021" o "2020 - Actual").
  const current = CURRENT.test(endText) || (!endText.trim() && CURRENT.test(exp.start_date || ''));
  const endKeys = dateKeys(endText);
  const start = startKeys[0];
  const end = current ? CURRENT_KEY : endKeys[endKeys.length - 1] ?? (startKeys.length > 1 ? startKeys[startKeys.length - 1] : start);
  if (start === undefined && end === undefined) return null;
  return [end ?? start!, start ?? end!];
}

export function educationKey(ed: Pick<EducationItem, 'graduation_year'>): number | null {
  const text = ed.graduation_year || '';
  if (CURRENT.test(text)) return CURRENT_KEY;
  const keys = dateKeys(text);
  return keys.length ? keys[keys.length - 1] : null;
}

const byKeyDesc = <T,>(items: T[], key: (x: T) => number[] | null): T[] =>
  items
    .map((item, i) => ({ item, i, k: key(item) }))
    .sort((a, b) => {
      if (!a.k && !b.k) return a.i - b.i;
      if (!a.k) return 1;
      if (!b.k) return -1;
      for (let j = 0; j < Math.max(a.k.length, b.k.length); j++) {
        const d = (b.k[j] ?? 0) - (a.k[j] ?? 0);
        if (d) return d;
      }
      return a.i - b.i;
    })
    .map((x) => x.item);

export const sortExperiences = (list: WorkExperience[]) => byKeyDesc(list || [], (e) => experienceKey(e));
export const sortEducation = (list: EducationItem[]) =>
  byKeyDesc(list || [], (e) => {
    const k = educationKey(e);
    return k === null ? null : [k];
  });

const sameOrder = <T,>(a: T[], b: T[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** ¿La experiencia o la educación están fuera del orden por fecha? */
export function isOutOfOrder(profile: Pick<CandidateProfile, 'experiences' | 'education'>): boolean {
  return !sameOrder(profile.experiences || [], sortExperiences(profile.experiences || [])) ||
    !sameOrder(profile.education || [], sortEducation(profile.education || []));
}

/** Perfil con experiencia y educación por fecha, salvo que la persona haya elegido un orden manual. */
export function withChronologicalOrder<P extends CandidateProfile>(profile: P): P {
  if (profile.cv_order === 'manual') return profile;
  const experiences = sortExperiences(profile.experiences || []);
  const education = sortEducation(profile.education || []);
  if (sameOrder(experiences, profile.experiences || []) && sameOrder(education, profile.education || [])) return profile;
  return { ...profile, experiences, education };
}
