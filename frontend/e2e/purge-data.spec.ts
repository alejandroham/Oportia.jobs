/** Borrar todos mis datos: confirmación con dos casillas, vuelta a la página principal y guía desde cero. */
import { test, expect } from '@playwright/test';

test('borrar todo pide confirmar sin respaldo y vuelve a la portada limpia', async ({ page }) => {
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.goto('/conoce-oportia');
  await page.evaluate(async () => {
    localStorage.setItem('nexusjob_onboarding_completed', 'true');
    localStorage.setItem('oportia_shared_ai_consent', '2026-11-18');
    localStorage.setItem('job_search_llm_model_gemini', 'gemini-x');
    localStorage.setItem('oportia_usage_minutes', '42');
    localStorage.setItem('oportia_theme', 'dark');
    localStorage.setItem('oportia_client_id', 'id-anterior');
    await new Promise<void>((res) => { const q = indexedDB.open('NexusJob_SovereignDB', 1); q.onupgradeneeded = () => q.result.createObjectStore('client_session');
      q.onsuccess = () => { const tx = q.result.transaction('client_session', 'readwrite'); const s = tx.objectStore('client_session');
        s.put({ name: 'Paula Rojas', headline: 'TENS', technical_skills: [], soft_skills: [], languages: {}, experiences: [], education: [], certifications: [] }, 'profile'); s.put(true, 'onboarding_completed'); tx.oncomplete = () => res(); }; });
  });
  await page.goto('/ajustes?tab=privacidad');
  await page.getByRole('button', { name: 'Borrar todos mis datos' }).click();
  const confirm = page.getByRole('button', { name: 'Borrar todo', exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByText('Entiendo que se borrarán').click();
  await expect(confirm).toBeDisabled(); // falta confirmar que no quiere respaldo
  await page.getByText('no quiero descargar un respaldo').click();
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await page.waitForURL((u) => u.pathname === '/');
  await expect(page.getByRole('heading', { name: /Tú manejas tu información/ })).toBeVisible();
  await expect(page.getByText('Tus datos fueron borrados de este navegador')).toBeVisible();
  const left = await page.evaluate(async () => {
    const keys = Object.keys(localStorage).filter((k) => /^(oportia_|nexusjob_|nexus_|job_search_)/.test(k) && k !== 'oportia_client_id').sort();
    const clientId = localStorage.getItem('oportia_client_id');
    const profile = await new Promise((res) => { const q = indexedDB.open('NexusJob_SovereignDB', 1);
      q.onsuccess = () => { const g = q.result.transaction('client_session').objectStore('client_session').get('profile'); g.onsuccess = () => res(g.result ?? null); }; });
    return { keys, profile, clientId };
  });
  expect(left.profile).toBeNull();
  expect(left.keys).toEqual(['oportia_theme']); // solo se conserva el tema
  expect(left.clientId).not.toBe('id-anterior'); // el identificador anónimo del cupo de IA es nuevo
  // La guía parte de cero y su primer paso es "Conecta la IA (opcional)".
  await page.getByRole('button', { name: 'Comenzar', exact: true }).click();
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Conecta la IA/ })).toBeVisible();
});
