/** 1.6.11 (DT-31): sin violaciones serias o críticas de axe-core (WCAG 2.2 AA) en las 6 rutas principales. */
import { test, expect, type Page } from '@playwright/test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');

const PROFILE = {
  name: 'Paula Ficticia Rojas', email: 'paula@example.com', phone: '+56 9 1111 2222', headline: 'TENS', region: 'Región de Valparaíso',
  technical_skills: ['Signos vitales', 'Curaciones'], soft_skills: [], languages: { Español: 'Nativo' }, education: [], certifications: [],
  experiences: [{ id: 'e1', role: 'TENS Urgencia', company: 'Hospital Ficticio', start_date: '2023', end_date: 'Actual', is_remote: false, description: 'Atención de pacientes.', technologies: [], bullet_achievements: ['Control de signos vitales'] }]
};
const JOB = {
  id: 'qa-1', title: 'TENS Urgencia', company: 'Clínica Ficticia', location: 'Viña del Mar, Región de Valparaíso', region: 'Región de Valparaíso',
  description: 'Buscamos TENS con experiencia en urgencia.', source: 'empleospublicos', url: 'https://example.com/oferta', is_remote: false, status: 'discovered'
};

async function seed(page: Page) {
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.goto('/conoce-oportia');
  await page.evaluate(async ({ profile, job }) => {
    localStorage.setItem('nexusjob_onboarding_completed', 'true');
    await new Promise<void>((res) => {
      const q = indexedDB.open('NexusJob_SovereignDB', 1);
      q.onupgradeneeded = () => q.result.createObjectStore('client_session');
      q.onsuccess = () => {
        const tx = q.result.transaction('client_session', 'readwrite');
        const s = tx.objectStore('client_session');
        s.put(profile, 'profile');
        s.put([job], 'jobs');
        s.put(true, 'onboarding_completed');
        tx.oncomplete = () => res();
      };
    });
  }, { profile: PROFILE, job: JOB });
}

async function axe(page: Page) {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async () => {
    // @ts-expect-error axe se inyecta en la página
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return r.violations
      .filter((v: any) => v.impact === 'serious' || v.impact === 'critical')
      .map((v: any) => `${v.impact} · ${v.id} · ${v.help} → ${v.nodes.slice(0, 3).map((n: any) => n.target.join(' ')).join(' | ')} (${v.nodes.length})`);
  });
}

for (const route of ['/', '/empleos', '/postulaciones', '/aprender', '/perfil', '/ajustes']) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`axe sin violaciones serias o críticas en ${route} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await seed(page);
      await page.evaluate((s) => localStorage.setItem('oportia_theme', s), scheme);
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await page.waitForTimeout(400);
      expect(await axe(page)).toEqual([]);
    });
  }
}

test('el panel de la oferta es un diálogo: foco al abrir, atrapado dentro y de vuelta al cerrar (DT-29)', async ({ page }) => {
  await seed(page);
  await page.goto('/empleos');
  const open = page.getByRole('button', { name: 'Ver detalle' }).first();
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'TENS Urgencia' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cerrar detalle' })).toBeFocused();
  // Tab y Mayús+Tab no salen del panel.
  for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 25; i++) await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  expect(await axe(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});

test('pestañas de Mi perfil, Ajustes y Aprender con role="tab" y aria-selected (DT-30)', async ({ page }) => {
  await seed(page);
  for (const [route, label, selected] of [
    ['/perfil', 'Secciones de Mi perfil', /Mi CV/],
    ['/ajustes', 'Pestañas de ajustes', /IA/],
    ['/aprender', 'Secciones de Aprender', /brechas/i]
  ] as const) {
    await page.goto(route);
    const list = page.getByRole('tablist', { name: label });
    await expect(list.getByRole('tab')).toHaveCount(4);
    await expect(list.getByRole('tab', { selected: true })).toHaveText(selected);
  }
});

test('"Saltar al contenido" es lo primero con el teclado y lleva al contenido (DT-30)', async ({ page }) => {
  await seed(page);
  await page.goto('/empleos');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#contenido')).toBeFocused();
});

test('con "reducir movimiento" no hay animaciones (DT-31)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page);
  await page.goto('/empleos');
  const duration = await page.locator('main .animate-fade-in').first().evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.01);
});
