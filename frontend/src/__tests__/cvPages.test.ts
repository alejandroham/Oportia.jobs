import { describe, expect, it } from 'vitest';
import { describePages, findFitScale, MIN_FIT_SCALE, PAGE_HEIGHT_PX } from '../utils/cvPages';

describe('hojas del CV', () => {
  it('describe cuántas hojas ocupa', () => {
    expect(describePages(0.8)).toBe('Cabe en 1 hoja');
    expect(describePages(1.0)).toBe('Cabe en 1 hoja');
    expect(describePages(1.3)).toBe('2 hojas al imprimir');
    expect(describePages(2.6)).toBe('3 hojas al imprimir');
  });

  it('busca la escala más grande con la que cabe', () => {
    // Alto proporcional a la escala: 1,1 hojas a tamaño normal.
    const measure = (s: number) => 1.1 * PAGE_HEIGHT_PX * s;
    const scale = findFitScale(measure, 1)!;
    expect(scale).toBeLessThan(1);
    expect(measure(scale)).toBeLessThanOrEqual(PAGE_HEIGHT_PX);
    expect(measure(scale + 0.02)).toBeGreaterThan(PAGE_HEIGHT_PX);
  });

  it('no achica si ya cabe y avisa si ni con la letra mínima cabe', () => {
    expect(findFitScale(() => PAGE_HEIGHT_PX * 0.9, 1)).toBe(1);
    expect(findFitScale((s) => 2 * PAGE_HEIGHT_PX * s, 1)).toBeNull();
    expect(MIN_FIT_SCALE).toBeGreaterThanOrEqual(0.8);
  });
});
