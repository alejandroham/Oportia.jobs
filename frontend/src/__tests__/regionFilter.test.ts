import { describe, it, expect } from 'vitest';
import { canonicalRegion, isJobInRegion } from '../utils/chileRegions';

/** 1.6.2 (DT-06): "En mi región" se calcula con la región actual, no con la marca guardada al buscar. */
describe('isJobInRegion', () => {
  const valpo = { location: 'Viña del Mar, Región de Valparaíso', region: 'Región de Valparaíso', is_user_region: true };
  const conce = { location: 'Concepción', region: null, is_user_region: false };

  it('ignora is_user_region guardado con el perfil anterior (caso de la auditoría)', () => {
    // Antes la oferta se marcó "tu región" con un perfil de Valparaíso; ahora el perfil es de Biobío.
    expect(isJobInRegion(valpo, 'Región del Biobío')).toBe(false);
    expect(isJobInRegion(valpo, 'Región de Valparaíso')).toBe(true);
  });

  it('detecta la región por la comuna cuando la oferta no la trae', () => {
    expect(isJobInRegion(conce, 'Región del Biobío')).toBe(true);
    expect(isJobInRegion(conce, 'Biobío')).toBe(true);
  });

  it('sin región no hay coincidencia', () => {
    expect(isJobInRegion(valpo, '')).toBe(false);
    expect(isJobInRegion({ location: 'Remoto' }, 'Región del Biobío')).toBe(false);
  });

  it('canonicalRegion acepta nombre corto o completo (filtro rápido y avanzado comparan igual)', () => {
    expect(canonicalRegion('Valparaíso')).toBe('Región de Valparaíso');
    expect(canonicalRegion('region de valparaiso')).toBe('Región de Valparaíso');
    expect(canonicalRegion('Atlántida')).toBeNull();
  });

  it('acepta los nombres oficiales largos del servidor y del índice', () => {
    const all = [
      'Región Metropolitana de Santiago', 'Región de Valparaíso', 'Región de Antofagasta', 'Región de Los Lagos',
      'Región del Biobío', "Región del Libertador General Bernardo O'Higgins", 'Región del Maule', 'Región de Coquimbo',
      'Región de Atacama', 'Región de Magallanes y de la Antártica Chilena', 'Región de Tarapacá', 'Región de La Araucanía',
      'Región de Ñuble', 'Región de Los Ríos', 'Región de Arica y Parinacota', 'Región de Aysén del General Carlos Ibáñez del Campo'
    ];
    const canon = all.map((r) => canonicalRegion(r));
    expect(canon.every(Boolean)).toBe(true);
    expect(new Set(canon).size).toBe(16);
    expect(canonicalRegion("Región del Libertador Bernardo O'Higgins")).toBe(canonicalRegion("Región del Libertador General Bernardo O'Higgins"));
    expect(isJobInRegion({ region: 'Región de Aysén del General Carlos Ibáñez del Campo' }, 'Región de Aysén')).toBe(true);
  });
});
