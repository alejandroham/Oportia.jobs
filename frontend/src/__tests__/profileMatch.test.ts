import { describe, expect, it } from 'vitest';
import type { CandidateProfile, JobPosting } from '../types';
import { profileMatch, profileMatcher } from '../utils/profileMatch';
import { profileSearchTerms, withDetectedKeywords } from '../utils/profileKeywords';
import { matchesQuery } from '../utils/searchText';

const job = (title: string, description = ''): JobPosting =>
  ({ id: title, title, company: 'X', location: 'Chile', is_remote: false, description, source: 't', status: 'discovered', discovered_at: '' }) as JobPosting;

const profile = (p: Partial<CandidateProfile>): CandidateProfile =>
  ({ name: 'P', headline: '', technical_skills: [], soft_skills: [], experiences: [], education: [], certifications: [], languages: {}, ...p }) as CandidateProfile;

describe('Etapa D: palabras clave del perfil', () => {
  it('"ti" no calza con "tienda"', () => {
    expect(matchesQuery('Jefe de Tienda', 'soporte ti')).toBe(false);
    expect(matchesQuery('Soporte TI nivel 2', 'soporte ti')).toBe(true);
  });

  it('afinidad: el cargo pesa el doble que la descripción', () => {
    const terms = ['Soporte TI', 'Redes', 'Windows Server'];
    const a = profileMatch(job('Técnico de Soporte TI y Redes'), terms);
    const b = profileMatch(job('Administrativo', 'Conocimientos de redes'), terms);
    const c = profileMatch(job('Vendedor de tienda'), terms);
    expect(a.matched).toEqual(['Soporte TI', 'Redes']);
    expect(a.score).toBeGreaterThan(b.score);
    expect(c).toEqual({ score: 0, matched: [] });
  });

  it('términos del perfil: palabras clave, profesiones y habilidades sin repetir', () => {
    const p = profile({ keywords: ['Soporte TI', 'Redes'], primary_profession: 'Técnico en informática', technical_skills: ['redes', 'Excel'] });
    expect(profileSearchTerms(p)).toEqual(['Soporte TI', 'Redes', 'Técnico en informática', 'Excel']);
    expect(profileMatcher(p)(job('Soporte TI')).matched).toEqual(['Soporte TI']);
  });

  it('al subir el CV agrega solo las palabras de su área que aparecen en el CV', () => {
    const p = profile({
      primary_profession: 'Técnico en informática',
      experiences: [{ role: 'Soporte TI', company: 'A', start_date: '2020', description: 'Mesa de ayuda, Active Directory y redes LAN', bullet_achievements: [], technologies: [] }] as any
    });
    const out = withDetectedKeywords(p);
    expect(out.keywords).toEqual(expect.arrayContaining(['Soporte TI', 'Mesa de ayuda', 'Redes', 'Active Directory']));
    expect(out.keywords).not.toContain('Windows Server');
    // Sin área detectada, no cambia nada.
    expect(withDetectedKeywords(profile({ primary_profession: 'Astronauta' }))).toEqual(profile({ primary_profession: 'Astronauta' }));
  });
});
