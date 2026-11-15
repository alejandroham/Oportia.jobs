import { describe, it, expect } from 'vitest';
import { parseProfileCommand, applyProfileChanges, describeChange } from '../utils/profileCommands';
import { suggestKeywords, getProfileLinks } from '../utils/profileKeywords';
import type { CandidateProfile } from '../types';

const base: CandidateProfile = {
  name: 'Paula', headline: 'Técnico en Enfermería', primary_profession: 'Técnico en Enfermería', years_of_experience: 6,
  technical_skills: ['Curaciones'], soft_skills: [], languages: {}, experiences: [], education: [], certifications: []
};

describe('Cambios al perfil desde el chat', () => {
  it('habilidades: "agrega Excel avanzado y SAP a mis habilidades"', () => {
    const c = parseProfileCommand('Opi, agrega Excel avanzado y SAP a mis habilidades');
    expect(c).toEqual([{ kind: 'skills', values: ['Excel avanzado', 'SAP'] }]);
    const p = applyProfileChanges(base, c);
    expect(p.technical_skills).toEqual(['Curaciones', 'Excel avanzado', 'SAP']);
  });

  it('no duplica habilidades existentes (sin importar mayúsculas/tildes)', () => {
    const p = applyProfileChanges(base, parseProfileCommand('añade curaciones a mis habilidades'));
    expect(p.technical_skills).toEqual(['Curaciones']);
  });

  it('palabras clave y habilidades blandas', () => {
    expect(parseProfileCommand('agrega IAAS a mis palabras clave')[0]).toEqual({ kind: 'keywords', values: ['IAAS'] });
    expect(parseProfileCommand('suma liderazgo a mis habilidades blandas')[0]).toEqual({ kind: 'soft_skills', values: ['Liderazgo'] });
  });

  it('diplomado y curso van a certificaciones', () => {
    const c = parseProfileCommand('Tengo un diplomado en Gestión en Salud de la Universidad de Chile');
    expect(c).toEqual([{ kind: 'certifications', values: ['Diplomado en Gestión en Salud'] }]);
    expect(parseProfileCommand('terminé un curso de Excel avanzado')[0].kind).toBe('certifications');
  });

  it('un segundo título va a educación', () => {
    const c = parseProfileCommand('Tengo un título de Técnico en Administración del IP Santo Tomás');
    expect(c[0].kind).toBe('education');
    const p = applyProfileChanges(base, c);
    expect(p.education).toHaveLength(1);
    expect(describeChange(c[0])).toContain('Técnico en Administración');
  });

  it('idiomas con nivel', () => {
    expect(parseProfileCommand('hablo inglés intermedio')[0]).toEqual({ kind: 'language', language: 'Inglés', level: 'Intermedio' });
    expect(parseProfileCommand('manejo portugués nivel básico')[0]).toEqual({ kind: 'language', language: 'Portugués', level: 'Básico' });
  });

  it('enlaces con nombre', () => {
    const c = parseProfileCommand('mi linkedin es linkedin.com/in/paula-rojas');
    expect(c[0]).toEqual({ kind: 'link', link: { label: 'LinkedIn', url: 'https://linkedin.com/in/paula-rojas' } });
    const p = applyProfileChanges(base, c);
    expect(getProfileLinks(p)).toEqual([{ label: 'LinkedIn', url: 'https://linkedin.com/in/paula-rojas' }]);
    expect(parseProfileCommand('agrega mi portafolio https://paula.cl')[0]).toMatchObject({ kind: 'link', link: { label: 'Portafolio' } });
  });

  it('profesión adicional', () => {
    expect(parseProfileCommand('también soy técnico en administración')[0]).toEqual({ kind: 'profession', value: 'Técnico en administración' });
  });

  it('una pregunta normal no se interpreta como cambio', () => {
    expect(parseProfileCommand('¿Cómo mejoro mi CV para un cargo de urgencia?')).toEqual([]);
    expect(parseProfileCommand('Hola Opi')).toEqual([]);
  });
});

describe('Palabras clave sugeridas', () => {
  it('sugiere términos de salud para una TENS y omite los que ya tiene', () => {
    const s = suggestKeywords({ ...base, technical_skills: ['Curaciones'] });
    expect(s).toContain('Signos vitales');
    expect(s).not.toContain('Curaciones');
  });
  it('sugiere términos de informática para soporte TI', () => {
    expect(suggestKeywords({ ...base, headline: 'Encargado de Informática', primary_profession: 'Encargado de Informática' })).toContain('Mesa de ayuda');
  });
});
