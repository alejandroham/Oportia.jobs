/** CV adaptado más corto: elegir experiencias y largo, medidor de hojas, ajuste a la hoja y 👍/👎 (servidor simulado). */
import { test, expect } from '@playwright/test';

const now = new Date().toISOString();
const exp = (i: number, role: string, company: string, start: string, end: string) => ({
  id: `e${i}`, role, company, start_date: start, end_date: end, description: `Funciones de ${role.toLowerCase()} en ${company}.`,
  bullet_achievements: ['Logro uno', 'Logro dos'], technologies: [], is_remote: false });
const profile = { name: 'Rosa Pérez', headline: 'Supervisora de obra', primary_profession: 'Supervisora de obra', technical_skills: ['Lectura de planos'],
  soft_skills: [], languages: {}, education: [], certifications: [], keywords: [], updated_at: now,
  experiences: [exp(1, 'Supervisora de obra', 'Constructora Andes', '2022', 'Actual'), exp(2, 'Vendedora', 'Tienda Sur', '2020', '2022'),
    exp(3, 'Jefa de terreno', 'Inmobiliaria Mar', '2017', '2020'), exp(4, 'Cajera', 'Supermercado Uno', '2015', '2017'),
    exp(5, 'Ayudante de obra', 'Constructora Norte', '2012', '2015'), exp(6, 'Bodeguera', 'Ferretería Sol', '2010', '2012')] };
const job = { id: 'j1', title: 'Supervisor de obra', company: 'Constructora X', location: 'Santiago', is_remote: false, modality: 'Presencial',
  description: 'Supervisión de cuadrillas en obra. Envía tu CV a seleccion@constructorax.cl indicando pretensiones.', url: 'https://www.empleospublicos.cl/oferta/1', salary_range: '$1.400.000', source: 'empleospublicos', tags: [], discovered_at: now, status: 'saved' };
const longBullets = Array.from({ length: 40 }, (_, i) => `- Logro medible número ${i + 1} con resultados concretos en obra, plazos y seguridad del equipo de trabajo.`).join('\n');

test('elige experiencias y largo, mide las hojas y ajusta a la hoja', async ({ page }) => {
  const draftBodies: any[] = [];
  const opinions: any[] = [];
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/settings', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ provider: 'gemini', has_active_key: false, has_own_key: false, active_model_name: 'gemini', status_label: 'IA', status_color: 'green', has_gemini_key: false, shared_ai: { available: true, remaining: 12, daily_limit: 15 }, has_openai_key: false, has_claude_key: false }) }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.route('**/api/opinion', async (r) => { opinions.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"id":"abc"}' }); });
  await page.route('**/api/applications/draft', async (r) => {
    const body = JSON.parse(r.request().postData() || '{}');
    draftBodies.push(body);
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: 'd1', job_id: 'j1', job_title: job.title, company: job.company, created_at: now, ats_score: 80, ats_feedback: [], cover_letter: 'Estimado equipo:\n\nCarta.',
      tailored_cv_markdown: `# Rosa Pérez\nSupervisora de obra · Santiago\n## Experiencia\n### Supervisora de obra · Constructora Andes\n${longBullets}\n## Experiencia anterior\n- **Vendedora** · Tienda Sur (2020 – 2022)\n## Educación\n- Técnico en construcción`,
      cv_length: body.cv_options?.length, selection_method: body.cv_options?.experience_ids ? 'manual' : 'ia',
      selected_experience_ids: body.cv_options?.experience_ids ?? ['e1', 'e3', 'e5'],
      selection_reasons: { e1: 'Mismo cargo que la oferta.', e3: 'Controló avance de obra.', e5: 'Experiencia en obra gruesa.' } }) });
  });
  await page.goto('/conoce-oportia');
  await page.evaluate(async ({ p, j }) => {
    localStorage.setItem('nexusjob_onboarding_completed', 'true'); localStorage.setItem('oportia_shared_ai_consent', '2026-11-14');
    await new Promise<void>((res) => { const q = indexedDB.open('NexusJob_SovereignDB', 1); q.onupgradeneeded = () => q.result.createObjectStore('client_session');
      q.onsuccess = () => { const tx = q.result.transaction('client_session', 'readwrite'); const s = tx.objectStore('client_session'); s.put(p, 'profile'); s.put([j], 'jobs'); s.put(true, 'onboarding_completed'); tx.oncomplete = () => res(); }; });
  }, { p: profile, j: job });
  await page.goto('/postulaciones');
  await page.getByText('Supervisor de obra').first().click();

  // Resumen de la oferta: empresa, renta y cómo postular (correo publicado y enlace oficial).
  await expect(page.getByRole('button', { name: 'Resumen de la oferta' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'seleccion@constructorax.cl' })).toHaveAttribute('href', /^mailto:seleccion@constructorax\.cl\?subject=/);
  await expect(page.getByRole('link', { name: /Postular en Empleos Públicos/ })).toHaveAttribute('href', 'https://www.empleospublicos.cl/oferta/1');
  await expect(page.getByText('$1.400.000')).toBeVisible();

  // Con 6 experiencias se sugiere 1 hoja y que Opi elija.
  await expect(page.getByRole('radio', { name: '1 hoja' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: /Que Opi elija/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: /Generar CV y carta adaptados/ }).click();
  await expect(page.getByText('Controló avance de obra.')).toBeVisible({ timeout: 8000 });
  expect(draftBodies[0].cv_options).toEqual({ length: '1', experience_ids: null });

  // Medidor: el CV de prueba es largo, se pasa de 1 hoja; "Ajustar a la hoja" lo intenta.
  await expect(page.getByText(/hojas al imprimir \(pediste 1 hoja\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Ajustar a la hoja' }).click();
  await expect(page.getByText(/Letra y espacios al \d+ %|No cabe en 1 hoja/)).toBeVisible();
  // El texto del CV va justificado.
  const align = await page.locator('#cv-printable-area li').first().evaluate((el) => getComputedStyle(el).textAlign);
  expect(align).toBe('justify');

  // Elegir yo: se parte de lo que eligió Opi; quito una y vuelvo a generar.
  await page.getByRole('radio', { name: /Elegir yo/ }).click();
  await page.getByRole('checkbox', { name: 'Ayudante de obra en Constructora Norte' }).uncheck();
  await page.getByRole('button', { name: /Volver a adaptar con IA/ }).click();
  await expect.poll(() => draftBodies.length).toBe(2);
  expect(draftBodies[1].cv_options).toEqual({ length: '1', experience_ids: ['e1', 'e3'] });

  // 👍/👎 de un toque, una sola vez.
  await page.getByRole('button', { name: 'Sí, me sirvió' }).click();
  await expect(page.getByText('¡Gracias!')).toBeVisible();
  await expect.poll(() => opinions.length).toBe(1);
  expect(opinions[0]).toMatchObject({ rating: 5, trigger: 'rapida', moment: 'cv_adaptado' });
  await page.reload();
  await page.getByText('Supervisor de obra').first().click();
  await expect(page.getByRole('button', { name: 'Sí, me sirvió' })).toHaveCount(0);
  // Con un CV ya generado, el panel de largo y experiencias aparece plegado con su resumen.
  const collapsed = page.getByRole('button', { name: /Largo y experiencias del CV.*Elegidas por ti: 2 de 6 experiencias/ });
  await expect(collapsed).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('checkbox', { name: 'Vendedora en Tienda Sur' })).toHaveCount(0);
  await collapsed.click();
  await expect(page.getByRole('checkbox', { name: 'Vendedora en Tienda Sur' })).toBeVisible();
});
