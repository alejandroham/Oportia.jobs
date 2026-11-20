import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import apiSource from '../api.ts?raw';
import { api, ApiError } from '../api';

/**
 * 1.6.1 (DT-02): ninguna función de la API puede devolver una respuesta de error como si fueran datos.
 * Antes, 28 funciones hacían "return res.json()" sin mirar res.ok (por ejemplo, la evaluación STAR
 * mostraba 85 % cuando la IA respondía 429).
 */

// Funciones que, por diseño, devuelven un valor por defecto si el servidor no responde (lecturas de respaldo).
const WITH_FALLBACK = new Set(['getProfile', 'getPreferences', 'getJobs', 'getApplications', 'getSettings', 'checkLegacyExport']);
// No devuelven nada que mostrar (telemetría "dispara y olvida") o son alias de otra función ya probada.
const SKIP = new Set(['sendEvent', 'scrapeJobs']);

const job = { id: 'j1', title: 'TENS', company: 'X', description: '' } as any;
const profile = { name: 'Ana' } as any;
const file = new File(['hola'], 'cv.txt', { type: 'text/plain' });

/** Argumentos mínimos válidos para cada función (las que no aparecen se llaman con strings). */
const ARGS: Record<string, unknown[]> = {
  sendOpinion: [{ rating: 5, contact_consent: false, trigger: 'manual' }],
  updateProfile: [profile],
  uploadCV: [file],
  extractCVPreview: [file],
  careerInsights: [profile],
  aiAssistProfile: [{ section: 's', action: 'a', current_text: 't' }],
  suggestRoles: [profile],
  tailorVersion: [{ target_role: 'TENS' }],
  updatePreferences: [{}],
  chatMemory: ['hola'],
  submitOutcome: [{ job_id: 'j1', status: 'x', was_successful: false }, job, profile],
  searchJobs: [{ keywords: 'tens' }],
  evaluateJob: [job, profile],
  rankJobs: [[job], profile],
  applyJob: [job, profile],
  getInterviewPrep: [job, profile],
  getCoachDiagnostic: [profile],
  updateCoachCompetency: ['c1', {}],
  analyzeGaps: [profile, [job]],
  searchCoachCourses: [{}],
  generateLearningPath: ['TENS', []],
  updateMilestoneStatus: ['p1', 1, 'done'],
  evaluateTutorSolution: [{} as any, 'x'],
  getTargetedInterviewPrep: [job],
  updateSettings: [{ provider: 'gemini' }],
  updateRoleRecStatus: ['r1', true],
  updateJob: ['j1', {}],
  classifyJob: ['j1', { status: 'x' }],
  addJobHistory: ['j1', { event_type: 'x', title: 'y' }],
  sendFeedback: ['j1', 'like'],
};

const names = Object.keys(api).filter((k) => typeof (api as any)[k] === 'function' && !WITH_FALLBACK.has(k) && !SKIP.has(k));

describe('api: los errores del servidor se informan (DT-02)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: 'falló' }), { status: 500, headers: { 'Content-Type': 'application/json' } })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('hay funciones que revisar', () => {
    expect(names.length).toBeGreaterThan(40);
  });

  it.each(names)('%s rechaza con ApiError ante un 500', async (name) => {
    const fn = (api as any)[name] as (...a: unknown[]) => Promise<unknown>;
    const args = ARGS[name] ?? ['x', 'y'];
    await expect(fn(...args)).rejects.toBeInstanceOf(ApiError);
  });

  it('un 429 "ai_resting" conserva el código para mostrar el aviso de IA', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: { error: 'ai_resting', message: 'descansando' } }), { status: 429 })));
    await expect(api.evaluateInterviewAnswer('¿Pregunta?', 'Respuesta')).rejects.toMatchObject({ code: 'ai_resting', status: 429 });
  });

  it('api.ts no contiene "return res.json()"', () => {
    expect(apiSource).not.toMatch(/return\s+res\.json\(\)/);
  });
});
