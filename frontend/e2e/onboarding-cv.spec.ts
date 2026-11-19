/** Guía de inicio, paso 2: subir el CV muestra los datos detectados (servidor simulado). */
import { test, expect } from '@playwright/test';

const analyzed = {
  message: 'CV analizado exitosamente', method: 'reglas', note: 'Analizamos tu CV sin IA (lectura básica).',
  profile: { name: 'Rosa Pérez Soto', email: 'rosa@correo.cl', phone: '+56 9 8765 4321', headline: 'Supervisora de obra', technical_skills: ['Lectura de planos', 'AutoCAD'],
    soft_skills: [], languages: {}, education: [], certifications: [], keywords: [], links: [],
    experiences: [{ id: 'e1', role: 'Supervisora de obra', company: 'Constructora Andes', start_date: 'Marzo 2015', end_date: 'Actual', description: 'Cuadrillas', technologies: [], bullet_achievements: [], is_remote: false }] }
};

test('la guía de inicio carga los datos del CV subido', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  let uploads = 0;
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.route('**/api/profile/upload', async (r) => { uploads++; await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(analyzed) }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Comenzar', exact: true }).click();
  await page.getByRole('button', { name: /Lo haré después|Continuar|Omitir/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Sube tu CV para empezar' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 cv') });
  await expect.poll(() => uploads).toBe(1);
  await expect(page.getByText('Información detectada en tu currículum')).toBeVisible();
  await expect(page.locator('#temp-name-input')).toHaveValue('Rosa Pérez Soto');
  expect(errors.filter((e) => !/Failed to load resource|favicon/.test(e))).toEqual([]);
});

test('la guía de inicio avisa si el CV pesa más de 4 MB, sin enviarlo', async ({ page }) => {
  let uploads = 0;
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.route('**/api/profile/upload', async (r) => { uploads++; await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Comenzar', exact: true }).click();
  await page.getByRole('button', { name: /Lo haré después|Continuar|Omitir/ }).first().click();
  await page.locator('input[type=file]').setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(4 * 1024 * 1024 + 10) });
  await expect(page.getByText(/pesa más de 4 MB/)).toBeVisible();
  expect(uploads).toBe(0);
});
