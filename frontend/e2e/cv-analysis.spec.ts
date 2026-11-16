/** CV: la IA se pide ANTES de analizar el CV, el resultado indica el método y la experiencia se puede editar. */
import { test, expect } from '@playwright/test';

const analyzed = {
  method: 'reglas',
  note: 'Analizamos tu CV sin IA (lectura básica por secciones). Activa la IA y usa «Reanalizar con IA» para ordenar mejor tu experiencia, títulos y cursos.',
  profile: {
    name: 'Juan Pérez Soto', headline: 'Técnico en Construcción', technical_skills: ['AutoCAD'], soft_skills: [], languages: {},
    experiences: [
      { id: 'e1', role: 'Supervisor de Obra', company: 'Constructora Andes Sur', start_date: 'Marzo 2021', end_date: 'Actual', is_remote: false, description: '', technologies: [], bullet_achievements: [] },
      { id: 'e2', role: 'Jefe de Terreno', company: 'Inmobiliaria Bío Bío', start_date: 'Enero 2019', end_date: 'Febrero 2021', is_remote: false, description: '', technologies: [], bullet_achievements: [] }
    ],
    education: [{ degree: 'Técnico en Construcción', institution: 'IP Virginio Gómez', field_of_study: '', graduation_year: '2014' }],
    certifications: ['Curso BIM con Revit – OTEC Construye (2022)'],
    raw_cv_text: 'Juan Pérez Soto Técnico en Construcción ... (texto del CV)'
  }
};

test.setTimeout(60000);
test('pide la IA antes de subir el CV, informa el método y permite editar la experiencia', async ({ page }) => {
  let uploads = 0;
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.route('**/api/settings', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ provider: 'gemini', has_active_key: false, active_model_name: '', status_label: 'IA', status_color: 'yellow', has_gemini_key: false, has_openai_key: false, has_claude_key: false, shared_ai: { available: true, remaining: 10, daily_limit: 15 } }) }));
  await page.route('**/api/profile/upload', async (r) => { uploads++; await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(analyzed) }); });
  await page.goto('/conoce-oportia');
  await page.evaluate(() => localStorage.setItem('nexusjob_onboarding_completed', 'true'));
  await page.goto('/perfil');

  await page.locator('input[type=file]').first().setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 cv de prueba') });
  // Sin IA activa: primero se pide activarla y no se sube nada todavía.
  await expect(page.getByRole('heading', { name: 'Activa la IA para analizar tu CV' })).toBeVisible();
  expect(uploads).toBe(0);
  await expect(page.getByRole('button', { name: 'Analizar con IA' })).toBeDisabled();
  await page.getByRole('button', { name: 'Subir sin IA (lectura básica)' }).click();

  await expect(page.getByText(/Analizamos tu CV sin IA/).first()).toBeVisible();
  expect(uploads).toBe(1);
  await expect(page.getByRole('button', { name: 'Reanalizar con IA' }).first()).toBeVisible();
  await expect(page.getByText('3. Experiencia Laboral (2)')).toBeVisible();

  // Editar una experiencia existente y agregar una nueva.
  await page.getByRole('button', { name: /^Supervisor de Obra en Constructora Andes Sur.*Editar experiencia$/ }).click();
  await page.getByLabel('Cargo', { exact: true }).first().fill('Supervisor de Obra Gruesa', { timeout: 5000 });
  await page.getByRole('button', { name: 'Agregar experiencia' }).click({ timeout: 5000 });
  await page.getByLabel('Cargo', { exact: true }).first().fill('Capataz de Obra', { timeout: 5000 });
  await page.getByLabel('Empresa o institución', { exact: true }).first().fill('Constructora Lomas', { timeout: 5000 });
  await page.getByLabel('Desde', { exact: true }).first().fill('2015', { timeout: 5000 });
  await page.getByRole('button', { name: 'Guardar cambios' }).click({ timeout: 5000 });
  await expect(page.getByText('3. Experiencia Laboral (3)')).toBeVisible();

  const saved = await page.evaluate(async () => new Promise<any>((res) => {
    const q = indexedDB.open('NexusJob_SovereignDB', 1);
    q.onsuccess = () => { const g = q.result.transaction('client_session').objectStore('client_session').get('profile'); g.onsuccess = () => res(g.result); };
  }));
  expect(saved.experiences.map((e: any) => e.role)).toEqual(['Capataz de Obra', 'Supervisor de Obra Gruesa', 'Jefe de Terreno']);
  expect(saved.experiences[0].company).toBe('Constructora Lomas');
});
