/** 1.6.4: navegación sin desborde entre 360 y 1366 px (DT-11, DT-12) y página 404 (DT-13). */
import { test, expect } from '@playwright/test';

async function setup(page: import('@playwright/test').Page) {
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.goto('/conoce-oportia');
  await page.evaluate(() => localStorage.setItem('nexusjob_onboarding_completed', 'true'));
}

for (const width of [360, 375, 768, 820, 900, 1024, 1366]) {
  test(`sin scroll horizontal y con Ajustes y Opinión a la vista en ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.goto('/empleos');
    await expect(page.getByRole('heading', { name: 'Buscar empleo' })).toBeVisible();
    const { scrollW, clientW } = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
    expect(scrollW).toBe(clientW);
    for (const loc of [page.getByRole('link', { name: 'Ir a ajustes de la aplicación y privacidad' }), page.getByRole('button', { name: 'Danos tu opinión sobre Oportia' })]) {
      await expect(loc).toBeVisible();
      const box = await loc.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= clientW).toBe(true);
    }
    // Bajo 1024 px manda la barra inferior; desde 1024 px, la superior.
    const mobileNav = page.getByRole('navigation', { name: 'Navegación móvil' });
    const mainNav = page.getByRole('navigation', { name: 'Navegación principal' });
    if (width < 1024) {
      await expect(mobileNav).toBeVisible();
      await expect(mainNav).toBeHidden();
    } else {
      await expect(mainNav).toBeVisible();
      await expect(mobileNav).toBeHidden();
    }
  });
}

test('en 375 px los enlaces del pie no quedan tapados por Opi ni la barra inferior', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await setup(page);
  await page.goto('/empleos');
  await expect(page.getByRole('heading', { name: 'Buscar empleo' })).toBeVisible();
  // Bajar hasta el final (se repite mientras la página termina de cargar y crece).
  await page.waitForFunction(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' as ScrollBehavior });
    return Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 1;
  });
  for (const name of ['Danos tu opinión', 'Privacidad', 'Términos']) {
    const el = page.locator('footer').getByText(name, { exact: true });
    await expect(el).toBeVisible();
    const free = await el.evaluate((node) => {
      const r = node.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && (node.contains(hit) || hit.contains(node))) return 'libre';
      const cover = hit?.closest('nav, button, [role="status"], .fixed') || hit;
      return `${cover?.tagName} ${cover?.getAttribute('aria-label') || cover?.className?.toString().slice(0, 60)} | top=${Math.round(r.top)} vh=${innerHeight}`;
    });
    expect(free, name).toBe('libre');
  }
});

test('una ruta inexistente muestra la página 404 sin cambiar la URL', async ({ page }) => {
  await setup(page);
  await page.goto('/ruta-inexistente');
  await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/ruta-inexistente');
  await expect(page).toHaveTitle(/Página no encontrada/);
  await page.getByRole('main').getByRole('link', { name: 'Buscar empleo' }).click();
  await expect(page).toHaveURL(/\/empleos$/);
  await expect(page).not.toHaveTitle(/Página no encontrada/);
});
