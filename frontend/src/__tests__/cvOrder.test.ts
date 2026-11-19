import { describe, expect, it } from 'vitest';
import type { CandidateProfile, WorkExperience } from '../types';
import { experienceKey, isOutOfOrder, sortCertifications, sortEducation, sortExperiences, withChronologicalOrder } from '../utils/cvOrder';

const exp = (id: string, start_date: string, end_date = ''): WorkExperience => ({
  id, start_date, end_date, role: id, company: 'X', is_remote: false, description: '', technologies: [], bullet_achievements: []
});

describe('orden cronológico del CV', () => {
  it('entiende años, meses en número o palabra, rangos y "Actual"', () => {
    expect(experienceKey(exp('a', 'Marzo 2021', 'Diciembre de 2023'))).toEqual([202312, 202103]);
    expect(experienceKey(exp('b', '03/2019', '2021-07'))).toEqual([202107, 201903]);
    expect(experienceKey(exp('c', '2019 – 2021'))).toEqual([202100, 201900]);
    expect(experienceKey(exp('d', 'ene. 2022', 'Actual'))?.[0]).toBeGreaterThan(300000);
    expect(experienceKey(exp('e', 'sin fecha'))).toBeNull();
  });

  it('pone primero el trabajo actual y luego por término e inicio; sin fecha al final', () => {
    const list = [exp('viejo', '2010', '2012'), exp('sin', ''), exp('medio', '2015', '2018'), exp('actual', '2022', 'Actual'), exp('reciente', 'Enero 2018', 'Mayo 2022')];
    expect(sortExperiences(list).map((e) => e.id)).toEqual(['actual', 'reciente', 'medio', 'viejo', 'sin']);
  });

  it('educación: en curso primero, luego por año de egreso', () => {
    const ed = (y: string) => ({ institution: y, degree: 'T', field_of_study: '', graduation_year: y });
    expect(sortEducation([ed('2011'), ed('En curso'), ed('2019'), ed('')]).map((e) => e.graduation_year)).toEqual(['En curso', '2019', '2011', '']);
  });

  it('respeta el orden manual y detecta cuando está desordenado', () => {
    const p = { experiences: [exp('viejo', '2010', '2012'), exp('nuevo', '2020', 'Actual')], education: [] } as unknown as CandidateProfile;
    expect(isOutOfOrder(p)).toBe(true);
    expect(withChronologicalOrder(p).experiences.map((e) => e.id)).toEqual(['nuevo', 'viejo']);
    expect(withChronologicalOrder({ ...p, cv_order: 'manual' }).experiences.map((e) => e.id)).toEqual(['viejo', 'nuevo']);
  });

  it('cursos y certificaciones del más reciente al más antiguo', () => {
    expect(sortCertifications(['Curso A (2018)', 'Licencia clase B', 'AWS 2022', 'Scrum 2020'])).toEqual(['AWS 2022', 'Scrum 2020', 'Curso A (2018)', 'Licencia clase B']);
  });
});
