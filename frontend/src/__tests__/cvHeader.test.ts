import { describe, expect, it } from 'vitest';
import type { CandidateProfile } from '../types';
import { missingContact, withProfileHeader } from '../utils/cvHeader';

const profile = {
  name: 'Rosa Pérez', headline: 'Supervisora de obra', email: 'rosa@correo.cl', phone: '+56 9 8765 4321',
  commune: 'Maipú', region: 'Región Metropolitana de Santiago', links: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/rosa/' }],
  experiences: [], education: [], technical_skills: [], soft_skills: [], certifications: [], languages: {}
} as unknown as CandidateProfile;

describe('encabezado del CV adaptado', () => {
  it('siempre pone correo, teléfono y comuna del perfil, aunque la IA no los escribiera o los cambiara', () => {
    const ai = '# Rosa\nSupervisora · rosa@INVENTADO.cl\n## Experiencia\n- Logro';
    const md = withProfileHeader(ai, profile);
    expect(md.startsWith('# Rosa Pérez\n\n**Supervisora de obra**\n\nrosa@correo.cl · +56 9 8765 4321 · Maipú, Región Metropolitana de Santiago\n\nlinkedin.com/in/rosa')).toBe(true);
    expect(md).not.toContain('INVENTADO');
    expect(md).toContain('## Experiencia\n- Logro');
  });

  it('avisa qué datos de contacto faltan', () => {
    expect(missingContact(profile)).toEqual([]);
    expect(missingContact({ ...profile, phone: '', commune: '', region: '' } as CandidateProfile)).toEqual(['teléfono', 'comuna']);
  });
});
