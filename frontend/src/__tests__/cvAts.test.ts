import { beforeEach, describe, expect, it } from 'vitest';
import type { WorkExperience } from '../types';
import { cleanText, formatEducation, formatPeriod } from '../utils/cvFormat';
import { findConflicts, ignoreConflict } from '../utils/cvConflicts';
import { atsChecks } from '../utils/atsCheck';

const exp = (id: string, role: string, company: string, start: string, end: string): WorkExperience => ({
  id, role, company, start_date: start, end_date: end, is_remote: false, description: '', technologies: [], bullet_achievements: []
});

describe('formato ATS', () => {
  beforeEach(() => localStorage.clear());

  it('fechas uniformes, educación sin redundancia y sin guiones blandos', () => {
    expect(formatPeriod({ start_date: '03/2023', end_date: '11/2024' })).toBe('Marzo 2023 – Noviembre 2024');
    expect(formatPeriod({ start_date: 'Oct 2026', end_date: 'Actual' })).toBe('Octubre 2026 – Actual');
    expect(formatEducation({ degree: 'Ingeniero en Informática', field_of_study: 'Informática', institution: 'U. X', graduation_year: '2015' })).toBe('Ingeniero en Informática – U. X (2015)');
    expect(cleanText('trans\u00ADformación')).toBe('transformación');
  });

  it('pregunta cuando el mismo cargo tiene fechas distintas, y recuerda si son cargos distintos', () => {
    const list = [exp('a', 'Consultor TI', 'Consultora Andes', '2019', '2022'), exp('b', 'Consultor TI Senior', 'Consultora Andes', '2018', '2025'), exp('c', 'Analista', 'Otra', '2015', '2017')];
    const found = findConflicts(list);
    expect(found).toHaveLength(1);
    expect([found[0].a.id, found[0].b.id]).toEqual(['a', 'b']);
    ignoreConflict(found[0].key);
    expect(findConflicts(list)).toHaveLength(0);
  });

  it('revisión ATS: fechas en línea propia, logros, tecnologías, idiomas y páginas', () => {
    const ok = `# Ana\n\n## Experiencia laboral\n### Dev — Prisat\nFebrero 2021 – Actual | Concepción\n\nDesarrollo.\n- a\n- b\n- c\n\nTecnologías: Python, React\n## Idiomas\nEspañol: Nativo`;
    expect(atsChecks(ok, 1.4).every((c) => c.ok)).toBe(true);
    const bad = `# Ana\n\n## Experiencia laboral\n### Dev — Prisat\n- a\n\nTecnologías: ${Array.from({ length: 13 }, (_, i) => `t${i}`).join(', ')}`;
    const failed = atsChecks(bad, 2.6).filter((c) => !c.ok).map((c) => c.label);
    expect(failed).toEqual(expect.arrayContaining(['Cada cargo con su fecha en una línea propia', 'Máximo 2 páginas', 'Al menos 3 logros en los 3 cargos más recientes', 'Máximo 12 tecnologías por cargo', 'Sección Idiomas']));
  });
});
