import { describe, expect, it } from 'vitest';
import { contactEmails, jobContact, shortSummary } from '../utils/jobContact';

describe('resumen y contacto de la oferta', () => {
  it('saca los correos publicados y descarta los de sistema', () => {
    const text = 'Envía tu CV a Seleccion@ConstructoraX.cl. Dudas: rrhh@constructorax.cl; no responder a noreply@portal.cl ni a logo@2x.png';
    expect(contactEmails(text)).toEqual(['seleccion@constructorax.cl', 'rrhh@constructorax.cl']);
    expect(contactEmails('')).toEqual([]);
  });

  it('resume en frases completas sin cortar palabras', () => {
    const long = 'Buscamos supervisor de obra para proyecto habitacional en Santiago. ' + 'Funciones de control de avance y calidad. '.repeat(20);
    const s = shortSummary(long, 120);
    expect(s.length).toBeLessThanOrEqual(121);
    expect(s.endsWith('.') || s.endsWith('…')).toBe(true);
    expect(shortSummary('Corta.')).toBe('Corta.');
  });

  it('ofrece solo enlaces http(s) como forma de postular', () => {
    expect(jobContact({ description: 'x', url: 'javascript:alert(1)', source: 'empleospublicos' }).applyUrl).toBeNull();
    const c = jobContact({ description: 'Postula a a@b.cl', url: 'https://www.empleospublicos.cl/x', source: 'empleospublicos' });
    expect(c.applyUrl).toBe('https://www.empleospublicos.cl/x');
    expect(c.emails).toEqual(['a@b.cl']);
  });
});
