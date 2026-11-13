import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveClientStore,
  getClientStore,
  clearClientStore,
  parseSessionBackupFile,
  type SessionBackupBundle
} from '../utils/storage';
import type { CandidateProfile, UserPreferences, JobPosting } from '../types';

function createMockProfile(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    name: 'María Pérez',
    headline: 'TENS Urgencias',
    region: 'Región del Biobío',
    commune: 'Concepción',
    years_of_experience: 4,
    technical_skills: ['Curaciones', 'Fármacos', 'Signos vitales'],
    soft_skills: ['Empatía', 'Trabajo en equipo'],
    languages: { Español: 'Nativo' },
    experiences: [],
    education: [],
    certifications: [],
    ...overrides
  };
}

function createMockPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    target_roles: ['TENS', 'Técnico en Enfermería'],
    preferred_locations: ['Concepción'],
    preferred_region: 'Región del Biobío',
    preferred_communes: ['Concepción'],
    remote_only: false,
    preferred_technologies: [],
    deal_breakers: [],
    auto_learned_insights: ['Turnos rotativos aceptados'],
    ...overrides
  };
}

function createMockJob(overrides: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 'job-1',
    title: 'Frontend Developer',
    company: 'Empresa SpA',
    location: 'Remoto',
    description: 'Desarrollo web',
    is_remote: true,
    source: 'test',
    tags: ['react'],
    discovered_at: new Date().toISOString(),
    status: 'applied_no_response',
    ...overrides
  };
}

describe('Sovereign Client Storage (storage.ts)', () => {
  beforeEach(async () => {
    await clearClientStore();
    localStorage.clear();
  });

  it('guarda y recupera un perfil en el almacén local', async () => {
    const mockProfile = createMockProfile();

    await saveClientStore('profile', mockProfile);
    const retrieved = await getClientStore<CandidateProfile>('profile');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('María Pérez');
    expect(retrieved?.headline).toBe('TENS Urgencias');
    expect(retrieved?.region).toBe('Región del Biobío');
  });

  it('devuelve null cuando una clave no existe', async () => {
    const nonExistent = await getClientStore<any>('non_existent_key_123');
    expect(nonExistent).toBeNull();
  });

  it('guarda y recupera preferencias de búsqueda', async () => {
    const mockPrefs = createMockPreferences();

    await saveClientStore('preferences', mockPrefs);
    const retrieved = await getClientStore<UserPreferences>('preferences');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.target_roles).toContain('TENS');
    expect(retrieved?.preferred_region).toBe('Región del Biobío');
  });

  it('interpreta y valida correctamente un paquete de respaldo de sesión', async () => {
    const profile = createMockProfile({
      name: 'Carlos Ruiz',
      headline: 'Ingeniero de Software'
    });
    const jobs = [createMockJob()];

    const bundle: SessionBackupBundle = {
      app: 'Oportia Jobs IA',
      format_version: '1.1',
      exported_at: new Date().toISOString(),
      candidate_name: 'Carlos Ruiz',
      payload: {
        profile,
        preferences: null,
        jobs,
        applications: []
      }
    };

    const bundleJson = JSON.stringify(bundle);
    const importedPayload = await parseSessionBackupFile(bundleJson);

    expect(importedPayload.profile?.name).toBe('Carlos Ruiz');
    expect(importedPayload.jobs).toHaveLength(1);
    expect(importedPayload.jobs[0].title).toBe('Frontend Developer');
  });

  it('purga todos los datos locales sin dejar rastro', async () => {
    await saveClientStore('profile', { name: 'Para Borrar' });
    await saveClientStore('jobs', [{ id: '1', title: 'Oferta' }]);

    await clearClientStore();

    const p = await getClientStore('profile');
    const j = await getClientStore('jobs');

    expect(p).toBeNull();
    expect(j).toBeNull();
  });
});
