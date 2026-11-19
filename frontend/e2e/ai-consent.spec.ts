/** IA gratuita: doble confirmación, aviso completo, comprobante descargable y aviso anónimo a Oportia. */
import { readFileSync } from 'fs';
import { test, expect } from '@playwright/test';

test('activar la IA gratuita exige dos casillas y entrega un comprobante', async ({ page }) => {
  const events: any[] = [];
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.route('**/api/settings', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ provider: 'gemini', has_active_key: false, has_own_key: false, active_model_name: 'gemini', status_label: 'IA', status_color: 'yellow', has_gemini_key: false, has_openai_key: false, has_claude_key: false, shared_ai: { available: true, remaining: 15, daily_limit: 15 } }) }));
  await page.route('**/api/event', async (r) => { events.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await page.goto('/conoce-oportia');
  await page.evaluate(() => { localStorage.setItem('nexusjob_onboarding_completed', 'true'); localStorage.setItem('oportia_shared_ai_consent', '2026-11-14'); });
  await page.goto('/ajustes');

  // El consentimiento de la versión anterior ya no basta: se vuelve a pedir.
  const activate = page.getByRole('button', { name: 'Activar IA gratuita' });
  await expect(activate).toBeDisabled();
  await expect(page.getByText('No se envían').first()).toBeVisible();

  // Aviso completo con exclusión de responsabilidad, descargable.
  await page.getByRole('button', { name: /Leer el aviso completo/ }).first().click();
  await expect(page.getByRole('heading', { name: '6. Exclusión y límites de responsabilidad' })).toBeVisible();
  const [doc] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar este documento' }).click()]);
  expect(doc.suggestedFilename()).toBe('Oportia-aviso-IA-gratuita-2026-11-18.html');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

  // Doble confirmación.
  await page.getByRole('checkbox', { name: /lo procesa Google/ }).check();
  await expect(activate).toBeDisabled();
  await page.getByRole('checkbox', { name: /Tengo 18 años o más/ }).check();
  await activate.click();
  await expect(page.getByText(/Te quedan/)).toBeVisible();

  // Oportia queda informada sin datos personales.
  await expect.poll(() => events.length).toBeGreaterThan(0);
  expect(events[0]).toMatchObject({ kind: 'consentimiento_ia', detail: { accion: 'acepta', version: '2026-11-18' } });
  expect(events[0].detail.codigo).toMatch(/^[0-9A-F]{8}$/);

  // Comprobante descargable con el código.
  const [receipt] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar mi comprobante' }).click()]);
  expect(receipt.suggestedFilename()).toBe(`Oportia-comprobante-IA-gratuita-${events[0].detail.codigo}.html`);
  const html = readFileSync(await receipt.path(), 'utf8');
  expect(html).toContain('Comprobante de aceptación');
  expect(html).toContain(events[0].detail.codigo);
  expect(html).toContain('Tengo 18 años o más');
});
