/**
 * Genera las capturas del manual de usuario (docs/manual/img/).
 *
 *   npm run docs:screenshots
 *
 * Usa una persona de demostración FICTICIA de un área no TI (Técnico en Enfermería) y
 * respuestas simuladas del servidor, para que las capturas sean reproducibles y no
 * dependan de Internet ni de una clave de IA. Ningún dato corresponde a personas o
 * empresas reales.
 */
import { test, type Page, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/manual/img');
const now = new Date().toISOString();
/** Fecha AAAA-MM-DD a `n` días de hoy (para que las etiquetas de vencimiento se vean siempre igual). */
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const profile = {
  name: 'Paula Rojas',
  email: 'paula.rojas@ejemplo.cl',
  phone: '+56 9 1234 5678',
  location: 'Viña del Mar, Región de Valparaíso',
  region: 'Región de Valparaíso',
  commune: 'Viña del Mar',
  headline: 'Técnico en Enfermería (TENS)',
  primary_profession: 'Técnico en Enfermería (TENS)',
  summary:
    'TENS con 6 años de experiencia en urgencia y hospitalización. Destaco por la atención cercana a pacientes, el registro clínico ordenado y el trabajo en equipo en turnos rotativos.',
  years_of_experience: 6,
  technical_skills: ['Toma de signos vitales', 'Curaciones', 'Administración de medicamentos', 'Registro clínico', 'Primeros auxilios'],
  soft_skills: ['Empatía', 'Trabajo en equipo', 'Manejo del estrés'],
  languages: { Español: 'Nativo', Inglés: 'Básico' },
  experiences: [
    {
      id: 'exp-1',
      company: 'Clínica Costa Azul (ficticia)',
      role: 'TENS de Urgencia',
      start_date: '2021',
      end_date: 'Actual',
      location: 'Viña del Mar',
      is_remote: false,
      description: 'Atención de pacientes adultos en el servicio de urgencia, en turnos de cuarto turno.',
      technologies: [],
      bullet_achievements: [
        'Apoyo en la atención de más de 40 pacientes por turno.',
        'Capacitación de 5 técnicos nuevos en protocolos de categorización.'
      ]
    },
    {
      id: 'exp-2',
      company: 'Hospital Base Los Aromos (ficticio)',
      role: 'TENS de Hospitalización',
      start_date: '2018',
      end_date: '2021',
      location: 'Quilpué',
      is_remote: false,
      description: 'Cuidados básicos y control de signos vitales en medicina interna.',
      technologies: [],
      bullet_achievements: ['Registro clínico sin observaciones en dos auditorías internas.']
    },
    {
      id: 'exp-3',
      company: 'Farmacia del Puerto (ficticia)',
      role: 'Auxiliar de farmacia',
      start_date: '2016',
      end_date: '2018',
      location: 'Valparaíso',
      is_remote: false,
      description: 'Atención de público, despacho de recetas y control de inventario.',
      technologies: [],
      bullet_achievements: ['Ordené el inventario de medicamentos controlados sin diferencias en dos cierres anuales.']
    },
    {
      id: 'exp-4',
      company: 'Tienda Costa (ficticia)',
      role: 'Vendedora',
      start_date: '2014',
      end_date: '2016',
      location: 'Viña del Mar',
      is_remote: false,
      description: 'Venta y atención de clientes en tienda de retail.',
      technologies: [],
      bullet_achievements: []
    }
  ],
  education: [
    { institution: 'Instituto Profesional Ejemplo', degree: 'Técnico de Nivel Superior', field_of_study: 'Enfermería', graduation_year: '2017' }
  ],
  certifications: ['Curso IAAS (Infecciones Asociadas a la Atención de Salud)', 'Soporte Vital Básico'],
  keywords: ['TENS', 'Urgencia', 'Signos vitales', 'Curaciones', 'Registro clínico'],
  updated_at: now
};

const preferences = {
  target_roles: ['Técnico en Enfermería', 'TENS de urgencia'],
  preferred_locations: ['Región de Valparaíso'],
  preferred_region: 'Región de Valparaíso',
  remote_only: false,
  preferred_technologies: [],
  deal_breakers: ['Turnos de 24 horas'],
  auto_learned_insights: []
};

const job = (id: string, title: string, company: string, location: string, extra: Record<string, unknown> = {}) => ({
  id,
  title,
  company,
  location,
  is_remote: false,
  modality: 'Presencial',
  region: 'Región de Valparaíso',
  description: `${title} en ${company}. Turnos rotativos, atención de pacientes y registro clínico. Requisito: título de TENS y registro en la Superintendencia de Salud.`,
  source: 'empleospublicos',
  tags: ['salud'],
  discovered_at: now,
  status: 'discovered',
  ...extra
});

const searchResults = [
  job('d1', 'Técnico en Enfermería (TENS) — Urgencia', 'Clínica Costa Azul (ficticia)', 'Viña del Mar, Región de Valparaíso', { salary_range: '$750.000 - $850.000 CLP', fit_score: 88, posted_at: inDays(-3), deadline: inDays(12) }),
  job('d2', 'TENS para Hospitalización Adultos', 'Hospital Base Los Aromos (ficticio)', 'Quilpué, Región de Valparaíso', { fit_score: 81, posted_at: inDays(-5), deadline: inDays(2) }),
  job('d3', 'Técnico Paramédico — CESFAM', 'CESFAM Cerro Alegre (ficticio)', 'Valparaíso, Región de Valparaíso', { source: 'chiletrabajos', discovered_at: inDays(-4), expires_at: inDays(41), expires_estimated: true }),
  job('d4', 'Asistente de Enfermería — Turno noche', 'Residencia Mar y Sol (ficticia)', 'Concón, Región de Valparaíso', { fit_score: 64, source: 'getonbrd', posted_at: inDays(-8) }),
  job('d5', 'Registered Nurse Assistant (Remote triage)', 'Telesalud Ejemplo (ficticia)', 'Remoto', { is_remote: true, modality: 'Remoto', source: 'lever', posted_at: inDays(-20), expires_at: inDays(25), expires_estimated: true }),
  job('d6', 'TENS Pabellón', 'Clínica Costa Azul (ficticia)', 'Viña del Mar, Región de Valparaíso', { posted_at: inDays(-1), deadline: inDays(20) })
];

const tracked = job('t1', 'TENS de Urgencia — Reemplazo', 'Clínica Bahía Serena (ficticia)', 'Valparaíso, Región de Valparaíso', {
  status: 'ready_to_send',
  tracked_at: now,
  posted_at: inDays(-2),
  deadline: inDays(9),
  fit_score: 86,
  tailored_cv_markdown:
    '# Paula Rojas\n**Técnico en Enfermería (TENS)** | Viña del Mar | paula.rojas@ejemplo.cl\n\n## Perfil profesional\nTENS con 6 años en urgencia, acostumbrada a la alta demanda y al registro clínico riguroso.\n\n## Competencias clave\n- Categorización y apoyo en urgencia\n- Toma de signos vitales y curaciones\n- Registro clínico\n\n## Experiencia laboral\n### TENS de Urgencia — Clínica Costa Azul\n*2021 – Actual · Viña del Mar*\n- Apoyo en la atención de más de 40 pacientes por turno.\n- Capacitación de 5 técnicos nuevos en protocolos de categorización.\n\n### TENS de Hospitalización — Hospital Base Los Aromos\n*2018 – 2021 · Quilpué*\n- Control de signos vitales y cuidados básicos en medicina interna, con registro clínico sin observaciones en dos auditorías internas.\n\n## Experiencia anterior\n- **Auxiliar de farmacia** · Farmacia del Puerto (ficticia) (2016 – 2018)\n- **Vendedora** · Tienda Costa (ficticia) (2014 – 2016)\n\n## Educación\n- **Técnico de Nivel Superior en Enfermería**, Instituto Profesional Ejemplo (2017)',
  tailored_cover_letter:
    'Estimado equipo de selección de Clínica Bahía Serena:\n\nPostulo al reemplazo de TENS de Urgencia. En los últimos cuatro años he trabajado en un servicio de urgencia con más de 40 pacientes por turno, donde aprendí a mantener la calma y el registro clínico al día.\n\nAdemás, capacité a cinco técnicos nuevos en los protocolos de categorización, lo que me permitió apoyar al equipo en los turnos de mayor demanda.\n\nQuedo atenta para conversar sobre cómo puedo aportar a su servicio.\n\nAtentamente,\nPaula Rojas'
});

const application = {
  id: 'app-1',
  job_id: 't1',
  job_title: tracked.title,
  company: tracked.company,
  tailored_cv_markdown: tracked.tailored_cv_markdown,
  cover_letter: tracked.tailored_cover_letter,
  ats_score: 86,
  ats_feedback: ['Palabras clave de urgencia bien representadas'],
  created_at: now,
  cv_length: '1',
  selection_method: 'ia',
  selected_experience_ids: ['exp-1', 'exp-2'],
  selection_reasons: {
    'exp-1': 'Mismo servicio que la oferta: urgencia con alta demanda.',
    'exp-2': 'Aporta control de signos vitales y registro clínico.'
  }
};

const gapsResponse = {
  method: 'reglas',
  jobs_analyzed: 3,
  items: [
    { requirement: 'Licencia de conducir clase B', status: 'brecha', evidence: null, job_titles: ['TENS de Urgencia — Reemplazo', 'TENS para Hospitalización Adultos'], area: 'General', course_query: 'Licencia de conducir clase B' },
    { requirement: 'Toma de muestras', status: 'brecha', evidence: null, job_titles: ['TENS para Hospitalización Adultos'], area: 'Salud', course_query: 'Toma de muestras' },
    { requirement: 'RCP', status: 'parcial', evidence: 'Certificación: Soporte Vital Básico', job_titles: ['TENS de Urgencia — Reemplazo'], area: 'Salud', course_query: 'RCP' },
    { requirement: 'IAAS', status: 'cumple', evidence: 'Certificación: Curso IAAS (Infecciones Asociadas a la Atención de Salud)', job_titles: ['TENS de Urgencia — Reemplazo', 'TENS Pabellón'], area: 'Salud', course_query: 'IAAS' },
    { requirement: 'Urgencia', status: 'cumple', evidence: 'Experiencia: TENS de Urgencia en Clínica Costa Azul (ficticia)', job_titles: ['TENS de Urgencia — Reemplazo'], area: 'Salud', course_query: 'Urgencia' }
  ]
};

const settingsResponse = {
  provider: 'gemini',
  has_active_key: false,
  active_model_name: 'gemini-2.0-flash',
  status_label: 'IA no conectada',
  status_color: 'yellow',
  has_gemini_key: false,
  has_openai_key: false,
  has_claude_key: false,
  gemini_model: 'gemini-2.0-flash',
  openai_model: 'gpt-4o',
  claude_model: 'claude-3-5-sonnet-latest',
  shared_ai: { available: true, provider: 'gemini', daily_limit: 15, remaining: 12 }
};

async function mockApi(page: Page) {
  // Respuesta neutra para todo lo no simulado explícitamente.
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: route.request().method() === 'GET' ? '[]' : '{}' })
  );
  await page.route('**/api/settings', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(settingsResponse) }));
  await page.route('**/api/legacy-export', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"found":false}' }));
  await page.route('**/api/jobs/search', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: searchResults,
        sources_failed: [],
        total: searchResults.length,
        from_index: true,
        index_generated_at: now,
        index_count: 742
      })
    })
  );
  await page.route('**/api/coach/gaps', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gapsResponse) })
  );
}

async function seed(page: Page, theme: 'light' | 'dark', opts: { consent?: boolean } = {}) {
  await page.goto('/conoce-oportia');
  await page.evaluate(
    async ({ profile, preferences, jobs, applications, theme, consent }) => {
      localStorage.setItem('oportia_theme', theme);
      localStorage.setItem('nexusjob_onboarding_completed', 'true');
      if (consent) localStorage.setItem('oportia_shared_ai_consent', '2026-11-14');
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('NexusJob_SovereignDB', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('client_session');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('client_session', 'readwrite');
          const store = tx.objectStore('client_session');
          store.put(profile, 'profile');
          store.put(preferences, 'preferences');
          store.put(jobs, 'jobs');
          store.put(applications, 'applications');
          store.put(true, 'onboarding_completed');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      });
    },
    { profile, preferences, jobs: [tracked], applications: [application], theme, consent: opts.consent ?? false }
  );
}

const shot = (page: Page, name: string, fullPage = false) =>
  page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82, fullPage });

const settle = (page: Page, ms = 900) => page.waitForTimeout(ms);

async function newPage(context: BrowserContext) {
  const page = await context.newPage();
  await mockApi(page);
  return page;
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

test('manual: primera visita y guía de inicio', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
  const page = await newPage(context);
  await page.addInitScript(() => localStorage.setItem('oportia_theme', 'light'));
  await page.goto('/');
  await settle(page, 1200);
  await shot(page, '01-portada');
  await page.getByRole('button', { name: 'Comenzar', exact: true }).click();
  await settle(page);
  await shot(page, '02-guia-paso1-ia');
  await page.getByRole('button', { name: /Continuar|Omitir/ }).first().click();
  await settle(page);
  await shot(page, '03-guia-paso2-cv');
  await page.getByRole('button', { name: /Continuar|Omitir/ }).first().click();
  await settle(page);
  await shot(page, '04-guia-paso3-busqueda');
  await context.close();
});

test('manual: uso diario con perfil de demostración', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
  const page = await newPage(context);
  await seed(page, 'light');

  await page.goto('/');
  await settle(page, 1200);
  await shot(page, '05-inicio');

  await page.goto('/perfil');
  await settle(page);
  await shot(page, '06-mi-perfil');
  await page.getByRole('button', { name: /Ver mi CV/ }).first().click();
  await settle(page);
  await shot(page, '07-vista-previa-cv');
  await page.keyboard.press('Escape');

  await page.goto('/perfil?tab=busqueda');
  await settle(page);
  await shot(page, '08-criterios-de-busqueda');

  await page.goto('/empleos');
  await settle(page);
  await page.getByPlaceholder(/Buscar por cargo/).fill('tens');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await settle(page, 1200);
  await shot(page, '09-buscar-empleo');
  await page.getByRole('button', { name: 'Ver detalle' }).first().click();
  await settle(page);
  await shot(page, '10-detalle-de-oferta');
  await page.keyboard.press('Escape');

  await page.goto('/postulaciones');
  await settle(page);
  await page.getByText(tracked.title).first().click();
  await settle(page);
  await shot(page, '11-postulacion-cv-adaptado', true);
  await page.getByRole('button', { name: /Carta de Presentación/ }).first().click();
  await settle(page);
  await shot(page, '12-postulacion-carta', true);
  await page.getByText(/Preparar entrevista/).first().click();
  await settle(page);
  await shot(page, '13-preparar-entrevista');

  await page.goto('/aprender');
  await settle(page);
  await shot(page, '14-aprender');

  await page.goto('/ajustes');
  await settle(page);
  await shot(page, '15-ajustes-ia-gratuita');
  await context.close();
});

test('manual: chat con Opi, modo oscuro y celular', async ({ browser }) => {
  const dark = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  const page = await newPage(dark);
  await seed(page, 'dark', { consent: true });
  await page.goto('/');
  await settle(page, 1200);
  await shot(page, '16-inicio-modo-oscuro');
  await page.getByText('Opi Copiloto').first().click();
  await settle(page);
  await shot(page, '17-chat-con-opi');
  await dark.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', isMobile: true, hasTouch: true });
  const m = await newPage(mobile);
  await m.addInitScript(() => localStorage.setItem('oportia_theme', 'light'));
  await m.goto('/');
  await settle(m, 1200);
  await shot(m, '18-celular-portada');
  await mobile.close();
});
