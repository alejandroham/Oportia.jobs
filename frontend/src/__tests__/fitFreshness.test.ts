import { describe, expect, it } from 'vitest';
import type { CandidateProfile, JobPosting, UserPreferences } from '../types';
import { isFitStale, profileFingerprint, withFreshFit } from '../utils/fitFreshness';

const profile = {
  name: 'Paula',
  headline: 'TENS',
  technical_skills: ['Curaciones'],
  soft_skills: [],
  experiences: [{ role: 'TENS de Urgencia', company: 'Clínica', start_date: '2021', description: 'Urgencia', bullet_achievements: [], technologies: [] }],
  education: [],
  certifications: [],
  languages: {},
  email: 'paula@ejemplo.cl'
} as unknown as CandidateProfile;
const prefs = { target_roles: ['TENS'], deal_breakers: [], remote_only: false, auto_learned_insights: [] } as unknown as UserPreferences;
const job = { id: 'j1', title: 'TENS', company: 'X', location: 'Chile', is_remote: false, description: '', source: 't', status: 'discovered', discovered_at: '' } as JobPosting;

describe('Porcentajes desactualizados al cambiar el perfil', () => {
  it('un porcentaje recién calculado está al día', () => {
    const fp = profileFingerprint(profile, prefs);
    expect(isFitStale(withFreshFit(job, 80, fp), fp)).toBe(false);
  });

  it('cambiar la experiencia lo desactualiza', () => {
    const fp = profileFingerprint(profile, prefs);
    const scored = withFreshFit(job, 80, fp);
    const updated = { ...profile, experiences: [...profile.experiences, { ...profile.experiences[0], role: 'TENS de Pabellón' }] };
    expect(isFitStale(scored, profileFingerprint(updated, prefs))).toBe(true);
  });

  it('lo que Opi aprende de ti también lo desactualiza', () => {
    const fp = profileFingerprint(profile, prefs);
    const scored = withFreshFit(job, 80, fp);
    const learned = { ...prefs, auto_learned_insights: ['Prefiere turnos diurnos'] };
    expect(isFitStale(scored, profileFingerprint(profile, learned))).toBe(true);
  });

  it('cambiar el correo o el teléfono no lo desactualiza', () => {
    const fp = profileFingerprint(profile, prefs);
    const scored = withFreshFit(job, 80, fp);
    expect(isFitStale(scored, profileFingerprint({ ...profile, email: 'otro@ejemplo.cl', phone: '+56 9' } as CandidateProfile, prefs))).toBe(false);
  });

  it('sin porcentaje no hay nada que actualizar; uno antiguo sin huella sí', () => {
    const fp = profileFingerprint(profile, prefs);
    expect(isFitStale(job, fp)).toBe(false);
    expect(isFitStale({ ...job, fit_score: 70 }, fp)).toBe(true);
  });
});
