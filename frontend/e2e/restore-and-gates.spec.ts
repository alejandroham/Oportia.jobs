/** Sin CV, Mis postulaciones y Aprender quedan bloqueadas; desde la portada se recuperan los datos de otro equipo. */
import { test, expect } from '@playwright/test';

const now = new Date().toISOString();
const backup = {
  app: 'Oportia Jobs IA', format_version: '1.2', exported_at: now, candidate_name: 'Rosa Pérez',
  payload: {
    profile: { name: 'Rosa Pérez', headline: 'Supervisora de obra', technical_skills: ['Planos'], soft_skills: [], languages: {}, education: [], certifications: [], keywords: [],
      experiences: [{ id: 'e1', role: 'Supervisora de obra', company: 'Constructora Andes', start_date: '2022', end_date: 'Actual', description: 'Obra', bullet_achievements: [], technologies: [], is_remote: false }], updated_at: now },
    preferences: null,
    jobs: [{ id: 'j1', title: 'Supervisor de obra', company: 'Constructora X', location: 'Santiago', is_remote: false, description: 'x', source: 'empleospublicos', tags: [], discovered_at: now, status: 'saved' }],
    applications: []
  }
};

test('bloquea secciones sin CV y recupera los datos desde la portada', async ({ page }) => {
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));

  // Sin CV: candado en el menú y pantalla que invita a subirlo o recuperar datos.
  await page.goto('/postulaciones');
  await expect(page.getByRole('heading', { name: /Mis postulaciones se activa con tu CV/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Subir mi CV' })).toHaveAttribute('href', '/perfil');
  await page.goto('/aprender');
  await expect(page.getByRole('heading', { name: /Aprender se activa con tu CV/ })).toBeVisible();
  await expect(page.getByLabel('Bloqueado hasta subir tu CV').first()).toBeVisible();
  // Mi perfil nunca se bloquea.
  await page.goto('/perfil');
  await expect(page.getByText(/se activa con tu CV/)).toHaveCount(0);

  // Portada: "¿Ya usabas Oportia en otro equipo? Recupera tus datos".
  await page.goto('/');
  await page.getByRole('button', { name: 'Recupera tus datos' }).click();
  await expect(page.getByRole('heading', { name: 'Recuperar mis datos' })).toBeVisible();
  await page.getByLabel('Archivo de respaldo').setInputFiles({ name: 'respaldo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByText('Datos restaurados correctamente')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recuperar mis datos' })).toHaveCount(0);

  // Ya con CV: se va a Inicio (no a la portada) y las secciones se desbloquean.
  await expect(page.getByRole('button', { name: 'Recupera tus datos' })).toHaveCount(0);
  await expect(page.getByLabel('Bloqueado hasta subir tu CV')).toHaveCount(0);
  await page.goto('/postulaciones');
  await expect(page.getByText('Supervisor de obra').first()).toBeVisible();
});
