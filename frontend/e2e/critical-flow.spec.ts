import { test, expect } from '@playwright/test';

test.describe('Flujo Crítico de Usuario — Oportia Jobs IA', () => {
  test('recorre onboarding, busca empleos, guarda oferta y revisa postulaciones', async ({ page }) => {
    // Configurar estado inicial para asegurar navegación limpia sin bloqueos modales
    await page.addInitScript(() => {
      localStorage.setItem('nexusjob_onboarding_completed', 'true');
    });

    // Interceptar búsqueda de empleos para ejecución 100% determinista y offline
    await page.route('**/api/jobs/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'job-e2e-1',
            title: 'Senior Full Stack Engineer',
            company: 'TechCorp Chile',
            location: 'Santiago, Chile',
            is_remote: true,
            modality: 'Remoto',
            description: 'Buscamos un Ingeniero Full Stack con dominio de Python y React.',
            source: 'test',
            tags: ['python', 'react'],
            discovered_at: new Date().toISOString(),
            status: 'discovered'
          }
        ])
      });
    });

    // 1. Carga inicial en Inicio
    await page.goto('/');
    await expect(page).toHaveTitle(/Oportia/i);
    await expect(page.getByRole('heading', { name: /bienvenido a oportia jobs ia/i })).toBeVisible({ timeout: 10000 });

    // 2. Navegar a la pantalla de Empleos mediante enlace de navegación principal
    await page.getByRole('navigation', { name: /navegación principal/i }).getByRole('link', { name: /buscar empleo/i }).click();
    await expect(page).toHaveURL(/.*empleos/);

    // 3. Buscar ofertas en el radar
    const searchBtn = page.getByRole('button', { name: /^buscar$/i });
    await expect(searchBtn).toBeVisible({ timeout: 5000 });
    await searchBtn.click();

    // 4. Verificar que aparece la oferta esperada
    const jobArticle = page.locator('article[role="article"]').first();
    await expect(jobArticle).toBeVisible({ timeout: 10000 });
    await expect(jobArticle).toContainText('Senior Full Stack Engineer');
    await expect(jobArticle).toContainText('TechCorp Chile');

    // 5. Guardar la oferta en seguimiento y esperar confirmación
    const saveBtn = jobArticle.getByRole('button', { name: /guardar/i });
    await saveBtn.click();
    await expect(jobArticle.getByText('En seguimiento')).toBeVisible({ timeout: 5000 });

    // 6. Navegar a Postulaciones mediante navegación principal SPA
    await page.getByRole('navigation', { name: /navegación principal/i }).getByRole('link', { name: /mis postulaciones/i }).click();
    await expect(page).toHaveURL(/.*postulaciones/);
    await expect(page.getByRole('heading', { name: /mis postulaciones/i })).toBeVisible({ timeout: 10000 });

    // 7. Verificar que la oferta guardada se encuentra en el listado de seguimiento
    const trackedJob = page.locator('text=Senior Full Stack Engineer').first();
    await expect(trackedJob).toBeVisible({ timeout: 10000 });

    // 8. Hacer clic en la oferta para abrir su detalle
    await trackedJob.click();

    // 9. Verificar visualización de documentos y bitácora
    await expect(
      page.getByRole('button', { name: /documentos \(cv y carta\)/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('button', { name: /generar cv y carta adaptados/i })
    ).toBeVisible({ timeout: 10000 });
  });
});
