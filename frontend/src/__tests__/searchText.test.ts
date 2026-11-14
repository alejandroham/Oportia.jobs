import { describe, it, expect } from 'vitest';
import { matchesQuery, normalizeText } from '../utils/searchText';

describe('matchesQuery (filtro local de Buscar empleo)', () => {
  it('ignora tildes y mayúsculas y compara por raíz', () => {
    expect(matchesQuery('Técnico en Enfermería (TENS)', 'enfermera')).toBe(true);
    expect(matchesQuery('EDUCADORA DE PÁRVULOS', 'educadora parvulos')).toBe(true);
    expect(matchesQuery('Vendedora part time', 'vendedor')).toBe(true);
  });

  it('exige cada palabra significativa, no la frase literal', () => {
    expect(matchesQuery('Jefe de Bodega - Retail', 'jefe bodega')).toBe(true);
    expect(matchesQuery('Jefe de Ventas', 'jefe de bodega')).toBe(false);
  });

  it('sin texto deja pasar todo', () => {
    expect(matchesQuery('Lo que sea', '   ')).toBe(true);
  });

  it('normalizeText quita tildes', () => {
    expect(normalizeText('Región de Ñuble')).toBe('region de nuble');
  });
});
