/** 1.6.9: formularios y estado del perfil (DT-23 validación, DT-24 "tiene CV", DT-25 cambios sin guardar, DT-26 largos). */
import { test, expect, type Page } from '@playwright/test';

const PROFILE = {
  name: 'Paula Ficticia Rojas', email: 'paula@example.com', phone: '+56 9 1111 2222', headline: 'TENS',
  technical_skills: ['Signos vitales'], soft_skills: [], languages: {}, education: [], certifications: [],
  experiences: [{ id: 'e1', role: 'TENS Urgencia', company: 'Hospital Ficticio', start_date: '2023', is_remote: false, description: '', technologies: [], bullet_achievements: [] }]
};

async function seed(page: Page, profile: object = PROFILE) {
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '{}' }));
  await page.route('**/api/legacy-export', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.goto('/conoce-oportia');
  await page.evaluate(async (p) => {
    localStorage.setItem('nexusjob_onboarding_completed', 'true');
    await new Promise<void>((res) => {
      const q = indexedDB.open('NexusJob_SovereignDB', 1);
      q.onupgradeneeded = () => q.result.createObjectStore('client_session');
      q.onsuccess = () => {
        const tx = q.result.transaction('client_session', 'readwrite');
        tx.objectStore('client_session').put(p, 'profile');
        tx.objectStore('client_session').put(true, 'onboarding_completed');
        tx.oncomplete = () => res();
      };
    });
  }, profile);
}

const savedProfile = (page: Page) =>
  page.evaluate(async () => new Promise<any>((res) => {
    const q = indexedDB.open('NexusJob_SovereignDB', 1);
    q.onsuccess = () => { const g = q.result.transaction('client_session').objectStore('client_session').get('profile'); g.onsuccess = () => res(g.result); };
  }));

test('no guarda un correo, teléfono o nombre inválidos y lo dice en rojo (DT-23)', async ({ page }) => {
  await seed(page);
  await page.goto('/perfil');
  await page.getByLabel('Correo electrónico').fill('correo-invalido@@x');
  await page.getByLabel('Teléfono').fill('abc123!!');
  await page.getByLabel(/Nombre completo/).fill('');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('No se guardó')).toBeVisible();
  await expect(page.getByText('Escribe tu nombre: es lo primero que aparece en tu CV.')).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Correo electrónico')).toHaveAttribute('aria-describedby', 'cv-email-error');
  await expect(page.getByLabel(/Nombre completo/)).toBeFocused();
  const p = await savedProfile(page);
  expect([p.name, p.email, p.phone]).toEqual([PROFILE.name, PROFILE.email, PROFILE.phone]);
});

test('los campos tienen largo máximo (DT-26)', async ({ page }) => {
  await seed(page);
  await page.goto('/perfil');
  await page.getByLabel(/Nombre completo/).fill('A'.repeat(532));
  expect((await page.getByLabel(/Nombre completo/).inputValue()).length).toBe(120);
});

test('un perfil sin nombre sigue contando como CV cargado: Aprender no se bloquea (DT-24)', async ({ page }) => {
  await seed(page, { ...PROFILE, name: '' });
  await page.goto('/aprender');
  await expect(page.getByRole('heading', { name: 'Aprender' })).toBeVisible();
  await expect(page.getByLabel('Bloqueado hasta subir tu CV')).toHaveCount(0);
});

test('avisa de cambios sin guardar: seguir editando, descartar o guardar y salir (DT-25)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page);
  await page.goto('/perfil');
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const dialog = page.getByRole('dialog', { name: 'Tienes cambios sin guardar' });

  await page.getByLabel('Teléfono').fill('+56 9 9999 8888');
  await nav.getByRole('link', { name: 'Buscar empleo' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Seguir editando' }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByLabel('Teléfono')).toHaveValue('+56 9 9999 8888');

  // Otra pestaña de Mi perfil también pregunta (antes la pestaña cambiaba y se perdían los cambios).
  await page.getByRole('tab', { name: /Qué busco/ }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Guardar y salir' }).click();
  await expect(page).toHaveURL(/tab=busqueda/);
  await expect.poll(async () => (await savedProfile(page)).phone).toBe('+56 9 9999 8888');

  await page.goto('/perfil');
  await page.getByLabel('Teléfono').fill('+56 9 0000 0000');
  await nav.getByRole('link', { name: 'Buscar empleo' }).click();
  await dialog.getByRole('button', { name: 'Descartar cambios' }).click();
  await expect(page).toHaveURL(/\/empleos$/);
  expect((await savedProfile(page)).phone).toBe('+56 9 9999 8888');
});
