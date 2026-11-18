import type { CandidateProfile, JobPosting, UserPreferences } from '../types';
import { sortEducation, sortExperiences } from './cvOrder';

/**
 * "Huella" de lo que la IA usa para calcular el porcentaje de compatibilidad:
 * tu experiencia, estudios, habilidades, palabras clave, lo que buscas y lo que Opi aprendió de ti.
 * Cada porcentaje guarda la huella con que se calculó; si cambia, el porcentaje quedó desactualizado.
 * (Datos de contacto o enlaces no cuentan: no cambian la compatibilidad.)
 */
export function profileFingerprint(profile: CandidateProfile | null | undefined, prefs?: UserPreferences | null): string {
  if (!profile) return '';
  const relevant = {
    h: profile.headline || '',
    p: profile.primary_profession || '',
    sp: profile.secondary_professions || [],
    s: profile.summary || '',
    y: profile.years_of_experience || 0,
    t: profile.technical_skills || [],
    so: profile.soft_skills || [],
    k: profile.keywords || [],
    c: profile.certifications || [],
    l: profile.languages || {},
    // Orden canónico por fecha: mover una experiencia con las flechas no cambia la compatibilidad.
    e: sortExperiences(profile.experiences || []).map((x) => [x.role, x.company, x.start_date, x.end_date, x.description, x.bullet_achievements, x.technologies]),
    ed: sortEducation(profile.education || []).map((x) => [x.degree, x.field_of_study, x.institution]),
    tr: prefs?.target_roles || [],
    db: prefs?.deal_breakers || [],
    r: Boolean(prefs?.remote_only),
    ai: prefs?.auto_learned_insights || [],
    st: (prefs?.learned_star_stories || []).length
  };
  return hash(JSON.stringify(relevant));
}

/** djb2: suficiente para detectar cambios (no es seguridad). */
function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Porcentaje calculado con un perfil distinto al actual (o antes de que existiera este control). */
export function isFitStale(job: JobPosting, fingerprint: string): boolean {
  if (job.fit_score === undefined || job.fit_score === null || !fingerprint) return false;
  return job.fit_profile_key !== fingerprint;
}

/** Marca un porcentaje recién calculado con la huella del perfil actual. */
export function withFreshFit(job: JobPosting, score: number, fingerprint: string): JobPosting {
  return { ...job, fit_score: score, fit_profile_key: fingerprint, fit_scored_at: new Date().toISOString() };
}
