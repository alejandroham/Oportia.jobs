import { describe, it, expect } from 'vitest';
import { hasCvLoaded } from '../utils/profileState';
import { contactErrors, isValidEmail, isValidPhone } from '../utils/validation';
import { computeNextStep } from '../utils/nextStep';

/** 1.6.9: una sola regla de "tiene CV" (DT-24) y validación compartida (DT-23). */
describe('hasCvLoaded', () => {
  it.each([
    ['sin perfil', null, false],
    ['perfil vacío por omisión', { name: 'Candidato', experiences: [], technical_skills: [] }, false],
    ['nombre borrado pero con experiencia', { name: '', experiences: [{ id: 'e1' }] }, true],
    ['solo habilidades', { name: 'Ana', technical_skills: ['Excel'] }, true],
    ['solo el texto del CV', { name: '', raw_cv_text: 'Paula Ficticia\nTENS' }, true]
  ])('%s', (_label, profile, expected) => {
    expect(hasCvLoaded(profile as any)).toBe(expected);
  });

  it('el siguiente paso usa la misma regla (no pide subir el CV si solo falta el nombre)', () => {
    const step = computeNextStep({ profile: { name: '', experiences: [{ id: 'e1' } as any] } });
    expect(step.route).not.toBe('/perfil');
  });
});

describe('validación de contacto', () => {
  it('rechaza los valores de la auditoría', () => {
    expect(isValidEmail('correo-invalido@@x')).toBe(false);
    expect(isValidPhone('abc123!!')).toBe(false);
    expect(contactErrors({ name: '  ', email: 'correo-invalido@@x', phone: 'abc123!!' })).toEqual({
      name: expect.any(String), email: expect.any(String), phone: expect.any(String)
    });
  });

  it('acepta datos válidos o vacíos (correo y teléfono son opcionales)', () => {
    expect(contactErrors({ name: 'Paula', email: 'paula@correo.cl', phone: '+56 9 1234 5678' })).toEqual({});
    expect(contactErrors({ name: 'Paula', email: '', phone: '' })).toEqual({});
  });
});
