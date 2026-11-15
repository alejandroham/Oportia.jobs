import { describe, it, expect } from 'vitest';
import { serializeBackup, parseSessionBackupFile, type BackupContent } from '../utils/storage';

const content: BackupContent = {
  profile: {
    name: 'Paula Rojas',
    headline: 'TENS',
    years_of_experience: 6,
    technical_skills: ['Curaciones'],
    soft_skills: ['Empatía'],
    languages: { Español: 'Nativo' },
    experiences: [],
    education: [
      { institution: 'IP Ejemplo', degree: 'Técnico de Nivel Superior', field_of_study: 'Enfermería' },
      { institution: 'Universidad Ejemplo', degree: 'Diplomado', field_of_study: 'Gestión en Salud' }
    ],
    certifications: ['IAAS']
  },
  preferences: {
    target_roles: ['TENS'],
    preferred_locations: [],
    remote_only: false,
    preferred_technologies: [],
    deal_breakers: ['Turnos de 24 h'],
    auto_learned_insights: ['Prefiere urgencia'],
    learned_star_stories: [{ title: 'Capacitación', situation_and_task: 's', action: 'a', result_and_metrics: 'r' } as any]
  },
  jobs: [{ id: 'j1' } as any],
  applications: [{ id: 'a1', job_id: 'j1' } as any],
  coachData: { competencies: [{ id: 'c1', name: 'Curaciones' }], learningPaths: [] },
  chatHistory: [{ id: 'm1', role: 'user', content: 'Hola Opi', timestamp: '2026-11-15' }]
};

describe('Respaldo completo', () => {
  it('sin contraseña: incluye perfil, qué busco, logros, lo que Opi sabe, Aprender y chat', async () => {
    const { fileContent, encrypted, filename } = await serializeBackup(content);
    expect(encrypted).toBe(false);
    expect(filename).toMatch(/^oportia_respaldo_paula_rojas_\d{4}-\d{2}-\d{2}\.json$/);
    const restored = await parseSessionBackupFile(fileContent);
    expect(restored.profile?.education).toHaveLength(2);
    expect(restored.preferences?.deal_breakers).toEqual(['Turnos de 24 h']);
    expect(restored.preferences?.learned_star_stories?.[0].title).toBe('Capacitación');
    expect(restored.preferences?.auto_learned_insights).toEqual(['Prefiere urgencia']);
    expect(restored.coach_data.competencies[0].name).toBe('Curaciones');
    expect(restored.chat_history?.[0].content).toBe('Hola Opi');
    expect(restored.jobs).toHaveLength(1);
    expect(restored.applications).toHaveLength(1);
  });

  it('con contraseña: queda cifrado, la contraseña no está en el archivo y solo abre con ella', async () => {
    const password = 'MiClaveSecreta-2026';
    const { fileContent, encrypted, filename } = await serializeBackup(content, { passphrase: password, hint: 'mi mascota' });
    expect(encrypted).toBe(true);
    expect(filename.endsWith('.oportia')).toBe(true);
    expect(fileContent).not.toContain(password);
    expect(fileContent).not.toContain('Paula Rojas');

    await expect(parseSessionBackupFile(fileContent)).rejects.toMatchObject({ isEncrypted: true, hint: 'mi mascota' });
    await expect(parseSessionBackupFile(fileContent, 'otra-clave')).rejects.toBeTruthy();

    const restored = await parseSessionBackupFile(fileContent, password);
    expect(restored.profile?.name).toBe('Paula Rojas');
    expect(restored.chat_history).toHaveLength(1);
  });

  it('lee respaldos antiguos (formato 1.1, sin chat)', async () => {
    const legacy = JSON.stringify({
      app: 'Oportia Jobs IA',
      format_version: '1.1',
      exported_at: '2026-11-10T00:00:00Z',
      payload: { profile: { name: 'Ana' }, preferences: null, jobs: [], applications: [] }
    });
    const restored = await parseSessionBackupFile(legacy);
    expect(restored.profile?.name).toBe('Ana');
    expect(restored.chat_history).toBeUndefined();
  });
});
