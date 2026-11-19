/** El PDF del CV debe verse igual que la vista previa (fuentes, colores y tamaños). */
import { test, expect } from '@playwright/test';
const now = new Date().toISOString();
const md = '# Rosa Pérez\nSupervisora de obra · rosa@ejemplo.cl · Santiago\n## Perfil profesional\nSupervisora de obra con más de diez años en edificación y obra gruesa. Coordino cuadrillas de hasta 25 personas y controlo avance y calidad.\n## Experiencia laboral\n### Supervisora de obra · Constructora Andes (2022 – actualidad)\n- Reduje los atrasos de obra gruesa en un 15 % reorganizando turnos y tareas de las cuadrillas según el programa de obra.\n- Implementé charlas diarias de seguridad.\n## Experiencia anterior\n- **Vendedora** · Tienda Sur (2020 – 2022)\n## Educación\n- Técnico en Construcción, Duoc UC (2011)';
const profile = { name: 'Rosa Pérez', headline: 'Supervisora de obra', technical_skills: ['Planos'], soft_skills: [], languages: {}, education: [], certifications: [], keywords: [], experiences: [{ id: 'e1', role: 'Supervisora', company: 'Andes', start_date: '2022', end_date: 'Actual', description: 'x', bullet_achievements: [], technologies: [], is_remote: false }], updated_at: now };
const job = { id: 'j1', title: 'Supervisor de obra', company: 'Constructora X', location: 'Santiago', is_remote: false, modality: 'Presencial', description: 'x', source: 'empleospublicos', tags: [], discovered_at: now, status: 'ready_to_send', tailored_cv_markdown: md, tailored_cover_letter: 'Carta' };
test('el PDF del CV conserva la tipografía de la vista previa', async ({ page, browser }) => {
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.goto('/conoce-oportia');
  await page.evaluate(async ({ p, j }) => { localStorage.setItem('nexusjob_onboarding_completed', 'true');
    await new Promise<void>((res) => { const q = indexedDB.open('NexusJob_SovereignDB', 1); q.onupgradeneeded = () => q.result.createObjectStore('client_session');
      q.onsuccess = () => { const tx = q.result.transaction('client_session', 'readwrite'); const s = tx.objectStore('client_session'); s.put(p, 'profile'); s.put([j], 'jobs'); s.put(true, 'onboarding_completed'); tx.oncomplete = () => res(); }; }); }, { p: profile, j: job });
  await page.goto('/postulaciones');
  await page.getByText('Supervisor de obra').first().click();
  await page.waitForTimeout(800);
  const styleOf = () => (el: Element) => { const c = getComputedStyle(el); return { color: c.color, size: c.fontSize, family: c.fontFamily, weight: c.fontWeight }; };
  const screenH2 = await page.locator('#cv-printable-area h2').first().evaluate(styleOf());
  const screenLi = await page.locator('#cv-printable-area li').first().evaluate(styleOf());
  // Capturar el documento que se imprime.
  await page.evaluate(() => { (window as any).__printed = null;
    const obs = new MutationObserver(() => { const f = document.querySelector('iframe[title="Vista de impresión"]') as HTMLIFrameElement | null; if (f && f.contentWindow) { f.contentWindow.print = () => { (window as any).__printed = f.contentDocument!.documentElement.outerHTML; }; } });
    obs.observe(document.body, { childList: true }); });
  await page.getByRole('button', { name: /Descargar o imprimir currículum/ }).click();
  await page.waitForFunction(() => (window as any).__printed, null, { timeout: 8000 });
  const html = await page.evaluate(() => (window as any).__printed as string);
  const p2 = await browser.newPage();
  await p2.setContent(html, { waitUntil: 'networkidle' });
  await p2.emulateMedia({ media: 'print' });
  // Impreso a lo ancho de una hoja A4 (178 mm útiles ≈ 673 px).
  await p2.setViewportSize({ width: 673, height: 1000 });
  expect(await p2.locator('h2').first().evaluate(styleOf())).toEqual(screenH2);
  expect(await p2.locator('li').first().evaluate(styleOf())).toEqual(screenLi);
  // PDF compatible con ATS: fuente Arial incrustada como TrueType, nunca Type 3; título "CV – Nombre – Cargo".
  const pdf = (await p2.pdf({ format: 'A4', preferCSSPageSize: true })).toString('latin1');
  expect(pdf).not.toContain('/Type3');
  expect(pdf).toMatch(/ArialMT|Arial-BoldMT|Helvetica|LiberationSans/);
  expect(html).toContain('<title>CV – Rosa Pérez – Supervisor de obra</title>');
  // Un solo margen de página: el que usa el medidor de hojas.
  expect(html).toContain('margin: 14mm 16mm');
});
