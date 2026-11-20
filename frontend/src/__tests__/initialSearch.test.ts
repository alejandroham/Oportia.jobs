import { describe, it, expect } from 'vitest';
import { initialSearchRoles } from '../utils/profileKeywords';
import type { CandidateProfile } from '../types';

/** 1.6.2 (DT-05): la primera búsqueda usa el cargo normalizado, no el titular literal del CV. */
const p = (x: Partial<CandidateProfile>) => ({ name: 'Ana', ...x }) as CandidateProfile;

describe('initialSearchRoles', () => {
  it('prioriza la profesión y sus nombres equivalentes', () => {
    const roles = initialSearchRoles(
      p({
        headline: 'TENS Servicio de Urgencia | Atención de pacientes',
        primary_profession: 'TENS',
        equivalent_roles: ['Técnico en Enfermería', 'Técnico de Nivel Superior en Enfermería', 'Paramédico', 'Auxiliar']
      })
    );
    expect(roles.slice(0, 4)).toEqual(['TENS', 'Técnico en Enfermería', 'Técnico de Nivel Superior en Enfermería', 'Paramédico']);
    expect(roles).not.toContain('TENS Servicio de Urgencia | Atención de pacientes');
  });

  it('sin profesión, usa solo la primera parte del titular', () => {
    expect(initialSearchRoles(p({ headline: 'Operador de Grúa Horquilla | Bodega' }))).toEqual(['Operador de Grúa Horquilla']);
  });

  it('descarta genéricos y repetidos', () => {
    expect(initialSearchRoles(p({ primary_profession: 'Profesional', equivalent_roles: ['Vendedor', 'vendedor'] }))).toEqual(['Vendedor']);
    expect(initialSearchRoles(null)).toEqual([]);
  });
});
