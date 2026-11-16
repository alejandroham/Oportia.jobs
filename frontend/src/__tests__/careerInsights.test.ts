import { describe, expect, it } from 'vitest';
import type { CareerInsights, UserPreferences } from '../types';
import { applyCareerInsights } from '../utils/careerInsights';
import { applyPreferenceChanges, describeChange, parseProfileCommand } from '../utils/profileCommands';

const prefs = (p: Partial<UserPreferences> = {}): UserPreferences =>
  ({ target_roles: [], preferred_locations: [], remote_only: false, preferred_technologies: [], deal_breakers: [], auto_learned_insights: [], ...p }) as UserPreferences;

const insights: CareerInsights = {
  method: 'ia',
  roles: [
    { title: 'Supervisor de Obra', category: 'directo', category_label: 'Tu experiencia directa', summary: 'Desde 2021.', evidence: [] },
    { title: 'Jefe de Terreno', category: 'directo', category_label: 'Tu experiencia directa', summary: '', evidence: [] },
    { title: 'Jefe de Obra', category: 'ascenso', category_label: 'Siguiente paso', summary: '', evidence: [] }
  ],
  achievements: [
    { id: 's1', title: 'Coordinación de cuadrillas', situation_and_task: '', action: 'Coordinó 3 cuadrillas', result_and_metrics: '', key_skills: [], source: 'cv_ia' },
    { id: 's2', title: 'Ya registrado', situation_and_task: '', action: 'x', result_and_metrics: '', key_skills: [], source: 'cv_ia' }
  ]
};

describe('Qué busco y Mis logros desde el CV', () => {
  it('agrega cargos directos, guarda las sugerencias y no duplica logros', () => {
    const before = prefs({ target_roles: ['jefe de terreno'], learned_star_stories: [{ id: 'x', title: 'Ya registrado', situation_and_task: '', action: '', result_and_metrics: '', key_skills: [], source: 'manual' }] });
    const { next, addedRoles, addedStories } = applyCareerInsights(before, insights);
    expect(addedRoles).toEqual(['Supervisor de Obra']); // "Jefe de Terreno" ya estaba; "Jefe de Obra" es ascenso (solo sugerido)
    expect(next.target_roles).toEqual(['jefe de terreno', 'Supervisor de Obra']);
    expect(next.suggested_roles?.map((r) => r.title)).toEqual(['Supervisor de Obra', 'Jefe de Terreno', 'Jefe de Obra']);
    expect(addedStories).toBe(1);
    expect(next.learned_star_stories?.[0].title).toBe('Coordinación de cuadrillas');
  });
});

describe('Opi actualiza Qué busco y Mis logros', () => {
  it('entiende agregar y quitar cargos', () => {
    expect(parseProfileCommand('agrega jefe de obra a lo que busco')).toEqual([{ kind: 'target_role', action: 'add', value: 'Jefe de obra' }]);
    expect(parseProfileCommand('busco trabajo de supervisor de obra')).toEqual([{ kind: 'target_role', action: 'add', value: 'Supervisor de obra' }]);
    expect(parseProfileCommand('ya no busco trabajo de capataz')).toEqual([{ kind: 'target_role', action: 'remove', value: 'Capataz' }]);
    expect(parseProfileCommand('quita jornal de lo que busco')[0]).toMatchObject({ kind: 'target_role', action: 'remove' });
  });

  it('entiende un logro y lo describe antes de guardarlo', () => {
    const c = parseProfileCommand('agrega un logro: entregué la obra 2 semanas antes del plazo');
    expect(c).toEqual([{ kind: 'achievement', text: 'Entregué la obra 2 semanas antes del plazo' }]);
    expect(describeChange(c[0])).toBe('Agregar a Mis logros: Entregué la obra 2 semanas antes del plazo');
  });

  it('aplica los cambios a las preferencias', () => {
    let p = applyPreferenceChanges(prefs({ target_roles: ['Capataz'] }), [
      { kind: 'target_role', action: 'add', value: 'Jefe de obra' },
      { kind: 'target_role', action: 'remove', value: 'capataz' },
      { kind: 'achievement', text: 'Entregué la obra 2 semanas antes del plazo' }
    ]);
    expect(p.target_roles).toEqual(['Jefe de obra']);
    expect(p.learned_star_stories?.[0]).toMatchObject({ source: 'opi', action: 'Entregué la obra 2 semanas antes del plazo' });
    p = applyPreferenceChanges(p, [{ kind: 'target_role', action: 'add', value: 'JEFE DE OBRA' }]);
    expect(p.target_roles).toEqual(['Jefe de obra']); // sin duplicar
  });

  it('los comandos de antes siguen funcionando', () => {
    expect(parseProfileCommand('agrega Excel a mis habilidades')).toEqual([{ kind: 'skills', values: ['Excel'] }]);
  });
});
