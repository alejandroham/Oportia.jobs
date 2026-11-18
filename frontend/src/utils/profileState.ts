import type { CandidateProfile } from '../types';

/** ¿Ya hay un CV cargado (con nombre real y experiencia, habilidades o titular)? */
export function hasCvLoaded(profile: CandidateProfile | null | undefined): boolean {
  return Boolean(
    profile &&
      profile.name?.trim() &&
      profile.name.trim().toLowerCase() !== 'candidato' &&
      (profile.experiences?.length || profile.technical_skills?.length || profile.headline)
  );
}
