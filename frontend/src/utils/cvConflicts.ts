import type { WorkExperience } from '../types';
import { normalizeText } from './searchText';
import { formatPeriod } from './cvFormat';

/**
 * Cargos que parecen el mismo (misma empresa y cargo parecido) pero con fechas distintas, por ejemplo porque
 * vienen de dos fuentes (CV y LinkedIn). Oportia no elige por su cuenta: le pregunta a la persona.
 */
export interface ExperienceConflict {
  key: string;
  a: WorkExperience;
  b: WorkExperience;
}

const IGNORE_KEY = 'oportia_conflicts_ignored';
const words = (t: string) => normalizeText(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 6));

function sameJob(a: WorkExperience, b: WorkExperience): boolean {
  const ca = normalizeText(a.company || '').trim();
  const cb = normalizeText(b.company || '').trim();
  if (!ca || !cb || ca.length < 3 || cb.length < 3) return false;
  if (!(ca === cb || ca.includes(cb) || cb.includes(ca))) return false;
  const ra = new Set(words(a.role || ''));
  const rb = words(b.role || '');
  return rb.some((w) => ra.has(w)) || normalizeText(a.role) === normalizeText(b.role);
}

export function ignoredConflicts(): string[] {
  try {
    return JSON.parse(localStorage.getItem(IGNORE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function ignoreConflict(key: string) {
  localStorage.setItem(IGNORE_KEY, JSON.stringify(Array.from(new Set([...ignoredConflicts(), key]))));
}

export function findConflicts(experiences: WorkExperience[]): ExperienceConflict[] {
  const ignored = new Set(ignoredConflicts());
  const out: ExperienceConflict[] = [];
  for (let i = 0; i < experiences.length; i++) {
    for (let j = i + 1; j < experiences.length; j++) {
      const a = experiences[i];
      const b = experiences[j];
      if (!sameJob(a, b)) continue;
      const titleDiffers = normalizeText(a.role) !== normalizeText(b.role);
      const datesDiffer = formatPeriod(a) !== formatPeriod(b);
      if (!titleDiffers && !datesDiffer) continue;
      const key = [a.id, b.id].sort().join('|');
      if (!ignored.has(key)) out.push({ key, a, b });
    }
  }
  return out;
}
