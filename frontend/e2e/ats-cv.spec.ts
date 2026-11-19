/** CV compatible con ATS: pregunta por fechas que no coinciden, muestra la coincidencia con la oferta y la revisión ATS. */
import { test, expect } from '@playwright/test';

const now = new Date().toISOString();
const exp = (id: string, role: string, company: string, start: string, end: string) => ({ id, role, company, start_date: start, end_date: end, location: 'Concepción', description: 'Desarrollo de sistemas.', bullet_achievements: ['Diseñé el ERP Ágora'], technologies: ['Python'], is_remote: false });
const profile = { name: 'Ana Rojas', email: 'ana@correo.cl', phone: '+56 9 1111 2222', commune: 'Concepción', region: 'Región del Biobío', headline: 'Desarrolladora', technical_skills: ['Python'], soft_skills: [], languages: { Español: 'Nativo' }, education: [], certifications: [], keywords: [], updated_at: now,
  experiences: [exp('e1', 'Consultora TI', 'Consultora Andes', '2019', '2022'), exp('e2', 'Consultora TI', 'Consultora Andes', '2018', '2025'), exp('e3', 'Desarrolladora', 'Prisat', '02/2021', 'Actual')] };
const job = { id: 'j1', title: 'Desarrolladora Python', company: 'Empresa X', location: 'Concepción', is_remote: false, description: 'Python, React', source: 'empleospublicos', tags: [], discovered_at: now, status: 'saved' };
const md = '# {{NOMBRE}}\n\n## Perfil profesional\nDesarrolladora con 7 años.\n\n## Experiencia laboral\n### Desarrolladora — Prisat\nFebrero 2021 – Actual | Concepción\n\nDesarrollo de sistemas.\n- Diseñé el ERP Ágora\n- Integré Mercado Público\n- Automaticé reportes\n\nTecnologías: Python\n\n## Idiomas\nEspañol: Nativo';

test('pregunta por fechas distintas, muestra coincidencia con la oferta y revisión ATS', async ({ page }) => {
  const drafts: any[] = [];
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/settings', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ provider: 'gemini', has_active_key: false, has_own_key: false, active_model_name: 'gemini', status_label: 'IA', status_color: 'green', has_gemini_key: false, shared_ai: { available: true, remaining: 12, daily_limit: 15 }, has_openai_key: false, has_claude_key: false }) }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.route('**/api/applications/draft', async (r) => {
    drafts.push(JSON.parse(r.request().postData() || '{}'));
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'd1', job_id: 'j1', job_title: job.title, company: job.company, created_at: now, ats_score: 80, ats_feedback: [], cover_letter: 'Carta', tailored_cv_markdown: md,
      cv_length: '2', selection_method: 'todas', selected_experience_ids: ['e3', 'e1'], selection_reasons: {}, fidelity_warnings: [],
      keyword_match: { score: 50, present: ['Python'], missing: ['React'] }, ats_notes: [] }) });
  });
  await page.goto('/conoce-oportia');
  await page.evaluate(async ({ p, j }) => {
    localStorage.setItem('nexusjob_onboarding_completed', 'true'); localStorage.setItem('oportia_shared_ai_consent', '2026-11-18');
    await new Promise<void>((res) => { const q = indexedDB.open('NexusJob_SovereignDB', 1); q.onupgradeneeded = () => q.result.createObjectStore('client_session');
      q.onsuccess = () => { const tx = q.result.transaction('client_session', 'readwrite'); const s = tx.objectStore('client_session'); s.put(p, 'profile'); s.put([j], 'jobs'); s.put(true, 'onboarding_completed'); tx.oncomplete = () => res(); }; });
  }, { p: profile, j: job });
  await page.goto('/postulaciones');
  await page.getByText('Desarrolladora Python').first().click();

  // Fechas que no coinciden: se pregunta antes de generar.
  await page.getByRole('button', { name: /Generar CV y carta adaptados/ }).click();
  await expect(page.getByRole('heading', { name: '¿Cuál es el dato correcto?' })).toBeVisible();
  expect(drafts).toHaveLength(0);
  await page.getByRole('button', { name: /Consultora TI — Consultora Andes\s*2018 – 2025/ }).click();
  await expect.poll(() => drafts.length).toBe(1);
  expect(drafts[0].profile.experiences.map((e: any) => e.id)).toEqual(['e3', 'e2']); // se quedó con 2018–2025 (y en orden por fecha)

  // Revisión ATS y coincidencia con la oferta.
  await expect(page.getByText(/Coincidencia con la oferta: 50 %/)).toBeVisible();
  const review = page.getByRole('button', { name: /Revisión para sistemas ATS/ });
  if ((await review.getAttribute('aria-expanded')) !== 'true') await review.click();
  await expect(page.getByText('Te faltan:')).toBeVisible();
  await expect(page.getByText('Cada cargo con su fecha en una línea propia')).toBeVisible();

  // Sin partición de palabras y fuente Arial en el CV.
  const style = await page.locator('#cv-printable-area li').first().evaluate((el) => ({ h: getComputedStyle(el).hyphens, f: getComputedStyle(el).fontFamily }));
  expect(style.h).toBe('none');
  expect(style.f).toMatch(/^Arial/);
});
