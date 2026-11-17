/** Importar oferta: pegar el texto (uso personal), Indeed no se lee por enlace y "Buscar también en" abre los portales. */
import { test, expect } from '@playwright/test';

const pasted = {
  method: 'ia', note: null,
  job: { id: 'p1', title: 'Supervisor de Obra', company: 'Constructora Los Andes SpA', location: 'Concepción', region: 'Región del Biobío',
    is_remote: false, modality: 'Presencial', salary_range: '$1.400.000 líquidos', deadline: '2026-11-30', description: 'Supervisión de obra.',
    url: 'https://cl.indeed.com/viewjob?jk=abc', source: 'pegada', tags: ['Pegada por ti', 'Indeed'], discovered_at: new Date().toISOString(), status: 'discovered' }
};

test('pegar el texto de una oferta la guarda en Mis postulaciones y ofrece buscar en otros portales', async ({ page }) => {
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.route('**/api/jobs/search', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ jobs: [], sources_failed: [], total: 0 }) }));
  await page.route('**/api/jobs/from-text', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pasted) }));
  await page.goto('/conoce-oportia');
  await page.evaluate(() => localStorage.setItem('nexusjob_onboarding_completed', 'true'));
  await page.goto('/empleos');

  await page.getByPlaceholder(/Buscar por cargo/).fill('supervisor de obra');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const indeed = page.getByRole('link', { name: /^Indeed/ });
  await expect(indeed).toHaveAttribute('href', /cl\.indeed\.com\/jobs\?q=supervisor%20de%20obra/);
  await expect(page.getByRole('link', { name: /^Computrabajo/ })).toHaveAttribute('href', 'https://cl.computrabajo.com/trabajo-de-supervisor-de-obra');

  await page.getByRole('button', { name: 'pégalo en Oportia' }).click();
  await expect(page.getByRole('heading', { name: 'Importar una oferta' })).toBeVisible();
  // Por enlace, Indeed no se lee.
  await page.getByRole('tab', { name: 'Enlace' }).click();
  await page.locator('#import-job-url').fill('https://cl.indeed.com/viewjob?jk=abc');
  await expect(page.getByText('Indeed no permite que otras apps lean sus avisos')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Importar oferta' })).toBeDisabled();
  await page.getByRole('button', { name: 'Pegar texto' }).last().click();

  await page.getByPlaceholder(/selecciona todo su texto/).fill('Supervisor de Obra\nConstructora Los Andes SpA\nConcepción · Presencial\nBuscamos supervisor de obra con experiencia en edificación y lectura de planos.');
  await page.getByRole('button', { name: 'Ordenar y guardar' }).click();
  await expect(page.getByText(/quedó guardada en Mis postulaciones/)).toBeVisible();

  await page.goto('/postulaciones');
  await expect(page.getByText('Supervisor de Obra').first()).toBeVisible();
  await expect(page.getByText(/Cierra el 30 nov/).first()).toBeVisible();
});
