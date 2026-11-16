import type { CandidateProfile, JobPosting } from '../types';
import { matchesQuery } from './searchText';
import { profileSearchTerms } from './profileKeywords';

/**
 * Afinidad de una oferta con el perfil, sin IA: cuántas de tus palabras clave, profesiones y
 * habilidades aparecen en el cargo (pesan el doble) o en la descripción.
 * Se usa para ordenar cuando la oferta aún no tiene evaluación con IA y para mostrar
 * "Calza con tu perfil" en la tarjeta.
 */
export interface ProfileMatch {
  score: number; // 0-100
  matched: string[]; // términos encontrados, los del cargo primero
}

export function profileMatch(job: JobPosting, terms: string[]): ProfileMatch {
  if (!terms.length) return { score: 0, matched: [] };
  const title = job.title || '';
  const body = [job.description, ...(job.tags || [])].join(' ');
  const inTitle: string[] = [];
  const inBody: string[] = [];
  for (const t of terms) {
    if (matchesQuery(title, t)) inTitle.push(t);
    else if (matchesQuery(body, t)) inBody.push(t);
  }
  // Con 3 coincidencias en el cargo (o 6 en la descripción) ya es una oferta muy afín.
  const points = inTitle.length * 2 + inBody.length;
  return { score: Math.min(100, Math.round((points / 6) * 100)), matched: [...inTitle, ...inBody] };
}

export function profileMatcher(profile: CandidateProfile | null | undefined) {
  const terms = profileSearchTerms(profile);
  return (job: JobPosting) => profileMatch(job, terms);
}
