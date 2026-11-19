/** Qué busco: cargos afines con su resumen (IA) · Mis logros: logros STAR desde el CV (respuestas simuladas). */
import { test, expect } from '@playwright/test';

const insights = {
  method: 'ia', note: null,
  roles: [
    { title: 'Supervisor de Obra', category: 'directo', category_label: 'Tu experiencia directa', summary: 'Ejerces este cargo desde 2021 en Constructora Andes Sur.', evidence: ['Supervisor de Obra, Constructora Andes Sur'] },
    { title: 'Jefe de Obra', category: 'ascenso', category_label: 'Siguiente paso', summary: 'Tus 8 años y tu paso como Jefe de Terreno te preparan para dirigir la obra.', evidence: ['Jefe de Terreno'] },
    { title: 'Inspector Técnico de Obra (ITO)', category: 'transferible', category_label: 'Por tus habilidades transferibles', summary: 'Tu control de calidad en terreno es clave para la inspección.', evidence: [] }
  ],
  achievements: [
    { id: 'star_a1', title: 'Coordinación de 3 cuadrillas', situation_and_task: 'Edificio de 12 pisos', action: 'Coordiné 3 cuadrillas (25 trabajadores)', result_and_metrics: 'Avance semanal informado al mandante', key_skills: ['Liderazgo'], source: 'cv_ia', created_at: '2026-11-16T12:00:00Z' }
  ]
};

test('sugiere cargos con resumen, permite agregarlos y extrae logros del CV', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.route('**/api/profile/career-insights', async (r) => { calls++; await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(insights) }); });
  await page.goto('/conoce-oportia');
  await page.evaluate(async () => {
    localStorage.setItem('nexusjob_onboarding_completed', 'true');
    await new Promise<void>((res) => { const q = indexedDB.open('NexusJob_SovereignDB', 1); q.onupgradeneeded = () => q.result.createObjectStore('client_session');
      q.onsuccess = () => { const tx = q.result.transaction('client_session', 'readwrite'); const s = tx.objectStore('client_session');
        s.put({ name: 'Juan Pérez Soto', headline: 'Técnico en Construcción', technical_skills: ['AutoCAD'], soft_skills: [], languages: {}, education: [], certifications: [],
          experiences: [{ id: 'e1', role: 'Supervisor de Obra', company: 'Constructora Andes Sur', start_date: '2021', is_remote: false, description: '', technologies: [], bullet_achievements: [] }] }, 'profile');
        s.put({ target_roles: ['Jefe de Terreno'], preferred_locations: [], remote_only: false, preferred_technologies: [], deal_breakers: [], auto_learned_insights: [] }, 'preferences');
        s.put(true, 'onboarding_completed'); tx.oncomplete = () => res(); }; });
  });

  await page.goto('/perfil?tab=busqueda');
  await page.getByRole('button', { name: 'Sugerir cargos con IA' }).click();
  await expect(page.getByText('Tus 8 años y tu paso como Jefe de Terreno te preparan para dirigir la obra.')).toBeVisible();
  await expect(page.getByText('Siguiente paso', { exact: true })).toBeVisible();
  // Desde este botón solo se sugiere: la persona elige qué agregar.
  await page.getByRole('button', { name: 'Agregar Supervisor de Obra a lo que busco' }).click();
  await page.getByRole('button', { name: 'Agregar Jefe de Obra a lo que busco' }).click();
  await expect(page.getByRole('button', { name: 'Quitar Jefe de Obra de lo que busco' })).toBeVisible();
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/que-busco.png`, fullPage: true });
  // Antes de recargar, esperar a que lo agregado quede escrito en el navegador.
  const savedRoles = () => page.evaluate(async () => new Promise<string[]>((res) => { const q = indexedDB.open('NexusJob_SovereignDB', 1);
    q.onsuccess = () => { const g = q.result.transaction('client_session').objectStore('client_session').get('preferences'); g.onsuccess = () => res(g.result?.target_roles || []); }; }));
  await expect.poll(savedRoles).toEqual(['Jefe de Terreno', 'Supervisor de Obra', 'Jefe de Obra']);

  await page.goto('/perfil?tab=logros');
  await expect(page.getByText('Coordinación de 3 cuadrillas')).toBeVisible(); // ya se agregó con la misma consulta
  await expect(page.getByText(/Desde tu CV \(IA\)/)).toBeVisible();
  expect(calls).toBe(1);

  const prefs = await page.evaluate(async () => new Promise<any>((res) => { const q = indexedDB.open('NexusJob_SovereignDB', 1);
    q.onsuccess = () => { const g = q.result.transaction('client_session').objectStore('client_session').get('preferences'); g.onsuccess = () => res(g.result); }; }));
  expect(prefs.target_roles).toEqual(['Jefe de Terreno', 'Supervisor de Obra', 'Jefe de Obra']);
  expect(prefs.suggested_roles).toHaveLength(3);
});
