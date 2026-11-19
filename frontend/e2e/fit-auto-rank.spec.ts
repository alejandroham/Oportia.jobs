/** Compatibilidad con IA automática y aviso cuando cambia el perfil (respuestas del servidor simuladas). */
import { test, expect } from '@playwright/test';

const now = new Date().toISOString();
const profile = { name: 'Paula Rojas', headline: 'TENS', primary_profession: 'TENS', technical_skills: ['Curaciones'], soft_skills: [], languages: {},
  experiences: [{ id: 'e1', role: 'TENS de Urgencia', company: 'Clínica', start_date: '2021', end_date: 'Actual', description: 'Urgencia', bullet_achievements: [], technologies: [], is_remote: false }],
  education: [], certifications: [], keywords: ['TENS'], updated_at: now };
const job = (id: string, title: string) => ({ id, title, company: `Empresa ${id}`, location: 'Santiago', is_remote: false, modality: 'Presencial', description: title, source: 'empleospublicos', tags: [], discovered_at: now, status: 'discovered', deadline: new Date(Date.now() + 9e8).toISOString().slice(0, 10) });
const results = [job('a', 'TENS Urgencia'), job('b', 'TENS Pabellón'), job('c', 'Auxiliar de farmacia')];
let rankCalls = 0;

test('ordena con IA sola y avisa cuando cambia el perfil', async ({ page }) => {
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/settings', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ provider: 'gemini', has_active_key: false, has_own_key: false, active_model_name: 'gemini', status_label: 'IA', status_color: 'green', has_gemini_key: false, shared_ai: { available: true, remaining: 12, daily_limit: 15 }, has_openai_key: false, has_claude_key: false }) }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.route('**/api/jobs/search', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ jobs: results, sources_failed: [], total: 3, from_index: true, index_count: 600, index_generated_at: now }) }));
  await page.route('**/api/jobs/rank', async (r) => {
    rankCalls++;
    const body = JSON.parse(r.request().postData() || '{}');
    const base = rankCalls === 1 ? { a: 91, b: 77, c: 35 } : { a: 95, b: 80, c: 40 };
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: body.jobs.map((j: any) => ({ job_id: j.id, fit_score: (base as any)[j.id], reason: '' })) }) });
  });
  await page.goto('/conoce-oportia');
  await page.evaluate(async (p) => {
    localStorage.setItem('nexusjob_onboarding_completed', 'true'); localStorage.setItem('oportia_shared_ai_consent', '2026-11-18');
    await new Promise<void>((res) => { const q = indexedDB.open('NexusJob_SovereignDB', 1); q.onupgradeneeded = () => q.result.createObjectStore('client_session');
      q.onsuccess = () => { const tx = q.result.transaction('client_session', 'readwrite'); const s = tx.objectStore('client_session'); s.put(p, 'profile'); s.put([], 'jobs'); s.put(true, 'onboarding_completed'); tx.oncomplete = () => res(); }; });
  }, profile);
  await page.goto('/empleos');
  await page.getByPlaceholder(/Buscar por cargo/).fill('tens');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText('91%').first()).toBeVisible({ timeout: 8000 });
  expect(rankCalls).toBe(1);

  // Cambio de experiencia en Mi perfil -> alerta
  await page.evaluate(async () => {
    await new Promise<void>((res) => { const q = indexedDB.open('NexusJob_SovereignDB', 1);
      q.onsuccess = () => { const tx = q.result.transaction('client_session', 'readwrite'); const s = tx.objectStore('client_session');
        const g = s.get('profile'); g.onsuccess = () => { const p = g.result; p.experiences.push({ id: 'e2', role: 'TENS de Pabellón', company: 'Hospital', start_date: '2018', end_date: '2021', description: 'Pabellón', bullet_achievements: [], technologies: [], is_remote: false }); s.put(p, 'profile'); }; tx.oncomplete = () => res(); }; });
  });
  await page.reload();
  await expect(page.getByText('Tu perfil cambió.')).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('Desactualizado').first()).toBeVisible();
  await page.getByRole('button', { name: 'Actualizar porcentajes' }).click();
  await expect(page.getByText('95%').first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('Tu perfil cambió.')).toHaveCount(0);
  await page.goto('/postulaciones');
});
