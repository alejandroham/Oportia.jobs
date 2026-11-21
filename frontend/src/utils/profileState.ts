import type { CandidateProfile } from '../types';

/**
 * ¿Ya hay un CV cargado? 1.6.9 (DT-24): una sola definición para toda la app.
 * Se basa en el contenido del CV (texto analizado, experiencias o habilidades), NO en el nombre:
 * antes, al borrar el nombre en Mi perfil se bloqueaba Aprender aunque el CV estuviera cargado, y había
 * cinco versiones distintas de esta regla (Navbar, App, Aprender, Qué busco, ranking y siguiente paso).
 */
export function hasCvLoaded(profile: Partial<CandidateProfile> | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.raw_cv_text?.trim() ||
      (profile.experiences?.length || 0) > 0 ||
      (profile.technical_skills?.length || 0) > 0
  );
}
