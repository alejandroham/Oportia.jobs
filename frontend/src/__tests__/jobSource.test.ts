import { describe, it, expect } from 'vitest';
import { getSourceLabel, safeExternalUrl } from '../utils/jobSource';

describe('Fuente de la oferta', () => {
  it('nombres legibles', () => {
    expect(getSourceLabel('linkedin_chile')).toBe('LinkedIn Chile');
    expect(getSourceLabel('empleospublicos')).toBe('Empleos Públicos');
    expect(getSourceLabel('ats_greenhouse')).toBe('Portal de la empresa');
    expect(getSourceLabel(undefined)).toBe('Fuente desconocida');
  });
  it('solo abre enlaces http(s)', () => {
    expect(safeExternalUrl('https://www.empleospublicos.cl/x')).toBe('https://www.empleospublicos.cl/x');
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('no es url')).toBeNull();
  });
});
