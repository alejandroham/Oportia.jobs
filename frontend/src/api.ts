import type {
  CandidateProfile,
  UserPreferences,
  JobPosting,
  JobSearchResponse,
  FitEvaluation,
  ApplicationDraft,
  LLMSettings,
  CompanyDirectoryItem,
  RoleRecommendation,
  GeneratedATSQuery,
  CompetencyDiagnosticItem,
  LearningCourseResource,
  LearningPath,
  TutorPracticeChallenge,
  TutorEvaluationResult,
  GapAnalysis,
  CareerInsights
} from './types';
import { decryptApiKeyLocally } from './utils/crypto';
import { getClientId, hasSharedAIConsent, reportSharedAIRemaining } from './utils/sharedAI';

export async function getLLMHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  const provider = (localStorage.getItem('job_search_default_provider') || 'gemini').toLowerCase();
  const headers: Record<string, string> = {
    'X-LLM-Provider': provider
  };
  const encKey = localStorage.getItem(`job_search_llm_key_${provider}`);
  if (encKey) {
    try {
      const decKey = await decryptApiKeyLocally(encKey);
      if (decKey) {
        headers['X-LLM-Key'] = decKey.trim();
      }
    } catch (e) {
      console.warn('Error al descifrar clave de API para headers:', e);
    }
  }
  const modelName = localStorage.getItem(`job_search_llm_model_${provider}`);
  if (modelName) {
    headers['X-LLM-Model'] = modelName.trim();
  }
  // IA gratuita de Oportia: ID anónimo para el cupo diario y consentimiento explícito.
  const clientId = getClientId();
  if (clientId) headers['X-Oportia-Client'] = clientId;
  if (!headers['X-LLM-Key'] && hasSharedAIConsent()) {
    headers['X-Oportia-Shared-AI-Consent'] = '1';
  }
  return headers;
}

function resolveApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string)?.trim();
  if (!envUrl) {
    return '/api';
  }
  // Strip trailing slashes
  let clean = envUrl.replace(/\/+$/, '');
  // If user provided a full URL (http/https) without /api, append /api automatically
  if (/^https?:\/\//i.test(clean) && !clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
}

export const API_BASE = resolveApiBase();

export async function safeFetchJson<T = any>(url: string, options?: RequestInit, fallback: T = null as any): Promise<T> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      // Server returned HTML (e.g. Vercel SPA rewrite fallback or error page)
      return fallback;
    }
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export class ApiError extends Error {
  code?: string;
  status?: number;
  provider?: string;

  constructor(message: string, code?: string, status?: number, provider?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.provider = provider;
  }
}

export function isAIRestingError(error: any): boolean {
  return Boolean(error && error.code === 'ai_resting');
}

export function isAINotConnectedError(error: any): boolean {
  if (!error) return false;
  if (error.code === 'ai_not_connected' || error.code === 'shared_ai_consent_required') return true;
  const msg = typeof error === 'string' ? error : (error.message || '');
  return msg.toLowerCase().includes('conecta una clave') || msg.toLowerCase().includes('ai_not_connected');
}

export function getHumanErrorMessage(error: any): string {
  if (!error) return 'Ocurrió un error inesperado.';
  const code = error.code;
  if (code === 'ai_not_connected') {
    return 'Activa la IA gratuita de Oportia o conecta tu propia clave en Ajustes para usar esta función.';
  }
  if (code === 'shared_ai_consent_required') {
    return 'Para usar la IA gratuita de Oportia, acepta primero el aviso en Ajustes o conecta tu propia clave.';
  }
  if (code === 'ai_resting') {
    return 'El servicio de IA está descansando un momento, intenta de nuevo en unos minutos. Si tienes tu propia clave de IA, conéctala en Ajustes para seguir sin límites.';
  }
  if (code === 'invalid_key') {
    return 'Tu clave de API no es válida o fue revocada. Revisa la clave en Ajustes.';
  }
  if (code === 'quota_exceeded') {
    return 'Has alcanzado el límite de cuota de tu proveedor de IA. Espera unos momentos o cambia de modelo en Ajustes.';
  }
  if (code === 'timeout') {
    return 'El proveedor de IA tardó demasiado en responder (tiempo de espera agotado). Intenta nuevamente.';
  }
  if (code === 'service_unavailable') {
    return 'El proveedor de IA no está disponible en este momento. Intenta más tarde.';
  }
  return error.message || String(error);
}

export async function handleResponse<T = any>(res: Response, defaultError = 'Error en la petición'): Promise<T> {
  reportSharedAIRemaining(res);
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) {
      if (res.status === 404 || res.status === 405) {
        throw new ApiError(`Ruta de backend no encontrada (${res.status}). Verifica que el backend esté activo.`, 'not_found', res.status);
      }
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new ApiError(`El backend está iniciando o no responde. Espera un instante y reintenta.`, 'service_unavailable', res.status);
      }
      throw new ApiError(`Error del servidor (${res.status}): ${text.slice(0, 150) || res.statusText || defaultError}`, 'server_error', res.status);
    }
    // Return empty object instead of crashing if HTML was returned
    return ({} as unknown) as T;
  }

  if (!res.ok) {
    const code = parsed?.error || (typeof parsed?.detail === 'object' ? parsed?.detail?.error : undefined);
    const message = (typeof parsed?.detail === 'string' ? parsed.detail : undefined) ||
      parsed?.message ||
      (typeof parsed?.detail === 'object' ? parsed?.detail?.message : undefined) ||
      defaultError;
    const provider = parsed?.provider || (typeof parsed?.detail === 'object' ? parsed?.detail?.provider : undefined);
    throw new ApiError(message, code, res.status, provider);
  }

  return parsed as T;
}

export interface CVAnalysisResult {
  message?: string;
  profile: CandidateProfile;
  /** "ia": la IA ordenó el CV; "reglas": lectura básica por secciones. */
  method?: 'ia' | 'reglas';
  note?: string | null;
}

export interface OpinionPayload {
  rating: number;
  liked?: string;
  improve?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_consent: boolean;
  /** Campo trampa (bots). */
  website?: string;
  trigger: 'manual' | 'auto';
}

export const api = {
  /** "¿Qué te parece Oportia?": opinión con contacto voluntario (solo con autorización). */
  sendOpinion: async (payload: OpinionPayload): Promise<{ ok: boolean; id: string }> => {
    const res = await fetch(`${API_BASE}/opinion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status === 422) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data?.detail) ? String(data.detail[0]?.msg || '').replace(/^Value error, /, '') : '';
      throw new ApiError(msg || 'Revisa los datos del formulario.', 'invalid', 422);
    }
    return handleResponse(res, 'No se pudo enviar tu opinión');
  },

  // Profile
  getProfile: async (): Promise<CandidateProfile> => {
    return safeFetchJson<CandidateProfile>(`${API_BASE}/profile`, undefined, null as any);
  },
  updateProfile: async (profile: CandidateProfile): Promise<CandidateProfile> => {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    return res.json();
  },
  /**
   * Sube el CV y lo analiza. Envía la clave propia o la aceptación de la IA gratuita: sin esto el servidor
   * no puede usar IA y el CV se lee de forma básica (method = "reglas", con un aviso en note).
   */
  uploadCV: async (file: File): Promise<CVAnalysisResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/profile/upload`, {
      method: 'POST',
      headers: { ...llmHeaders },
      body: formData
    });
    return handleResponse<CVAnalysisResult>(res, 'Error al procesar el CV');
  },
  /** Cargos afines (con resumen) y logros STAR desde el CV, en una sola consulta a la IA. */
  careerInsights: async (profile: CandidateProfile, preferences?: UserPreferences | null, useAi = true): Promise<CareerInsights> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/profile/career-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ profile, preferences: preferences || undefined, use_ai: useAi })
    });
    return handleResponse<CareerInsights>(res, 'Error al sugerir cargos y logros');
  },
  /** Vuelve a analizar con IA el texto del CV ya cargado (no hace falta subir el archivo otra vez). */
  reanalyzeCV: async (text: string): Promise<CVAnalysisResult> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/profile/reanalyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ text })
    });
    return handleResponse<CVAnalysisResult>(res, 'Error al reanalizar el CV');
  },
  extractCVPreview: async (file: File): Promise<{ message: string; extracted_profile: CandidateProfile; filename: string; text_length: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/profile/extract-preview`, {
      method: 'POST',
      headers: { ...llmHeaders },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al extraer información del documento');
    }
    return res.json();
  },
  aiAssistProfile: async (data: { section: string; action: string; current_text: string; target_role?: string }): Promise<{ original: string; suggestion: string; reasoning: string }> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/profile/ai-assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error('Error en la asistencia de IA');
    }
    return res.json();
  },

  suggestRoles: async (profile?: CandidateProfile): Promise<Array<{
    title: string;
    category: 'direct' | 'leadership' | 'transferable';
    category_label: string;
    reasoning: string;
    matching_skills: string[];
    seniority: string;
  }>> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/profile/suggest-roles`, {
      method: profile ? 'POST' : 'GET',
      headers: profile ? { 'Content-Type': 'application/json', ...llmHeaders } : { ...llmHeaders },
      body: profile ? JSON.stringify({ profile }) : undefined
    });
    if (!res.ok) return [];
    return res.json();
  },

  tailorVersion: async (data: {
    target_role: string;
    version_name?: string;
    profile?: CandidateProfile;
  }): Promise<{
    target_role: string;
    version_name: string;
    headline: string;
    summary: string;
    selected_skills: string[];
    match_rationale: string;
  }> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/profile/tailor-version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify(data)
    });
    return handleResponse(res, 'Error al optimizar versión con IA');
  },

  // Preferences & Cognitive AI Memory
  getPreferences: async (): Promise<UserPreferences> => {
    return safeFetchJson<UserPreferences>(`${API_BASE}/preferences`, undefined, null as any);
  },
  updatePreferences: async (prefs: UserPreferences): Promise<UserPreferences> => {
    const res = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    return res.json();
  },
  consolidateMemory: async (): Promise<UserPreferences> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/memory/consolidate`, {
      method: 'POST',
      headers: { ...llmHeaders }
    });
    if (!res.ok) throw new Error('Error al consolidar la memoria con IA');
    return res.json();
  },
  deleteLearnedStarStory: async (storyId: string): Promise<UserPreferences> => {
    const res = await fetch(`${API_BASE}/memory/stories/${storyId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar la historia de la memoria');
    return res.json();
  },
  resetMemory: async (): Promise<UserPreferences> => {
    const res = await fetch(`${API_BASE}/memory/reset`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Error al reiniciar la memoria IA');
    return res.json();
  },
  chatMemory: async (message: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>, profile?: CandidateProfile, preferences?: UserPreferences): Promise<{
    reply: string;
    has_new_story: boolean;
    new_story?: any;
    new_insights: string[];
    new_deal_breakers: string[];
    quick_replies?: string[];
    preferences: UserPreferences;
  }> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/memory/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ message, history: history || [], profile, preferences })
    });
    // handleResponse conserva el código de error (ai_resting, consentimiento) e informa el cupo restante.
    return handleResponse(res, 'Error al comunicarse con Opi');
  },
  sendFeedback: async (job_id: string, action: 'like' | 'dislike' | 'apply' | 'reject', notes?: string) => {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id, action, notes })
    });
    return res.json();
  },

  // Jobs
  getJobs: async (status?: string): Promise<JobPosting[]> => {
    const url = status ? `${API_BASE}/jobs?status=${status}` : `${API_BASE}/jobs`;
    return safeFetchJson<JobPosting[]>(url, undefined, []);
  },
  trackJob: async (job_id: string): Promise<JobPosting> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/track`, {
      method: 'POST'
    });
    return res.json();
  },
  updateJob: async (job_id: string, data: Partial<JobPosting>): Promise<JobPosting> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  classifyJob: async (job_id: string, data: { status: string; reason?: string; feedback?: string }): Promise<JobPosting> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  addJobHistory: async (job_id: string, data: { event_type: string; title: string; date?: string; notes?: string }): Promise<JobPosting> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteJobHistory: async (job_id: string, event_id: string): Promise<JobPosting> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/history/${event_id}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  deleteJob: async (job_id: string, from_section: 'radar' | 'tracker' = 'radar'): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}?from_section=${from_section}`, { method: 'DELETE' });
    return res.json();
  },
  clearAllJobs: async (): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/jobs`, { method: 'DELETE' });
    return res.json();
  },
  updateJobStatus: async (job_id: string, status: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },
  /** Registrar el resultado de una postulación (sin estado: todo viaja desde el navegador). */
  submitOutcome: async (
    submission: { job_id: string; status: string; was_successful: boolean; reason?: string; feedback_details?: string },
    job: JobPosting,
    profile: CandidateProfile | null,
    preferences?: UserPreferences | null
  ): Promise<{ plan: any; upskill_recommendations: string[]; auto_learned_insights: string[] }> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/jobs/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ submission, job, profile: profile ?? { name: 'Candidato' }, preferences: preferences ?? null })
    });
    return handleResponse(res, 'Error al registrar el resultado');
  },
  getRegions: async (): Promise<Array<{ id: string; name: string; short_name: string; communes: string[] }>> => {
    const res = await fetch(`${API_BASE}/regions`);
    return res.json();
  },
  searchJobs: async (req: {
    keywords?: string;
    remote_only?: boolean;
    search_scope?: string;
    region?: string;
    commune?: string;
    /** También consultar los portales en vivo (más lento). */
    live?: boolean;
    /** Palabras clave del perfil (solo cuando no hay término de búsqueda). */
    profile_keywords?: string[];
  }): Promise<JobSearchResponse> => {
    const res = await fetch(`${API_BASE}/jobs/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: req.keywords || '',
        remote_only: Boolean(req.remote_only),
        search_scope: req.search_scope || 'all',
        region: req.region,
        commune: req.commune,
        live: Boolean(req.live),
        profile_keywords: req.profile_keywords?.length ? req.profile_keywords : undefined
      })
    });
    const data = await handleResponse<JobSearchResponse | JobPosting[]>(res, 'Error al buscar empleos');
    if (Array.isArray(data)) {
      return { jobs: data, sources_failed: [], total: data.length };
    }
    return data;
  },
  scrapeJobs: async (keywords?: string, remote_only: boolean = false, scope: string = 'chile') => {
    return api.searchJobs({ keywords, remote_only, search_scope: scope });
  },
  /** "Pegar el texto de una oferta" (uso personal): Oportia la ordena; el servidor no la guarda. */
  jobFromText: async (text: string, url?: string): Promise<{ job: JobPosting; method: 'ia' | 'reglas'; note?: string | null }> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/jobs/from-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ text, url: url || undefined })
    });
    return handleResponse(res, 'No se pudo leer la oferta');
  },
  importJobUrl: async (url: string): Promise<{ message: string; job: JobPosting }> => {
    const res = await fetch(`${API_BASE}/jobs/import-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al importar la URL');
    }
    return res.json();
  },
  evaluateJob: async (jobOrId: string | JobPosting, profile?: CandidateProfile, preferences?: UserPreferences): Promise<FitEvaluation> => {
    const llmHeaders = await getLLMHeaders();
    if (typeof jobOrId === 'object') {
      const res = await fetch(`${API_BASE}/jobs/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...llmHeaders },
        body: JSON.stringify({ job: jobOrId, profile, preferences })
      });
      return handleResponse<FitEvaluation>(res, 'Error al evaluar compatibilidad');
    }
    const res = await fetch(`${API_BASE}/jobs/${jobOrId}/evaluate`, {
      method: 'POST',
      headers: { ...llmHeaders }
    });
    return handleResponse<FitEvaluation>(res, 'Error al evaluar compatibilidad');
  },
  getJobEvaluation: async (job_id: string): Promise<FitEvaluation | null> => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${job_id}/evaluation`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },
  /**
   * "Ordenar ofertas con IA": una sola consulta para hasta 15 ofertas.
   * Sin estado: el perfil y las ofertas viajan desde el navegador (antes se buscaban en el disco
   * del servidor, que en Vercel está vacío, y respondía "Carga tu CV primero").
   */
  rankJobs: async (
    jobs: JobPosting[],
    profile: CandidateProfile,
    preferences?: UserPreferences | null
  ): Promise<{ results: Array<{ job_id: string; fit_score: number; reason: string }> }> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/jobs/rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ jobs, profile, preferences: preferences ?? null })
    });
    return handleResponse(res, 'Error al ordenar ofertas');
  },

  // ATS Companies & Dynamic Role Recommendations (Radar Inteligente)
  getCompanies: async (country?: string, industry?: string): Promise<CompanyDirectoryItem[]> => {
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (industry) params.set('industry', industry);
    const res = await fetch(`${API_BASE}/companies?${params.toString()}`);
    return res.json();
  },
  getRoleRecommendations: async (forceRefresh: boolean = false): Promise<RoleRecommendation[]> => {
    const res = await fetch(`${API_BASE}/roles/recommendations?force_refresh=${forceRefresh}`);
    return res.json();
  },
  updateRoleRecStatus: async (recId: string, approved: boolean): Promise<RoleRecommendation> => {
    const res = await fetch(`${API_BASE}/roles/recommendations/${recId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved })
    });
    return res.json();
  },
  getATSQueries: async (): Promise<GeneratedATSQuery[]> => {
    const res = await fetch(`${API_BASE}/roles/ats-queries`);
    return res.json();
  },
  scrapeCustomATSQuery: async (query: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/jobs/scrape-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  // Applications
  // Opción A (sin estado): siempre se envían la oferta y el perfil completos desde el navegador.
  // No usar /jobs/{id}/apply: ese endpoint busca la oferta en el disco del servidor.
  applyJob: async (job: JobPosting, profile: CandidateProfile, preferences?: UserPreferences | null): Promise<ApplicationDraft> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/applications/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ job, profile, preferences: preferences ?? null })
    });
    return handleResponse<ApplicationDraft>(res, 'Error al generar postulación');
  },
  getApplications: async (): Promise<ApplicationDraft[]> => {
    return safeFetchJson<ApplicationDraft[]>(`${API_BASE}/applications`, undefined, []);
  },
  getApplicationByJob: async (job_id: string): Promise<ApplicationDraft | null> => {
    const res = await fetch(`${API_BASE}/applications/${job_id}`);
    if (res.status === 404) return null;
    return res.json();
  },
  deleteApplication: async (job_id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/applications/${job_id}`, { method: 'DELETE' });
    return res.json();
  },

  // Interview
  getInterviewPrep: async (jobOrId: string | JobPosting, profile?: CandidateProfile) => {
    const llmHeaders = await getLLMHeaders();
    if (typeof jobOrId === 'object' && profile) {
      const res = await fetch(`${API_BASE}/coach/interview-prep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...llmHeaders },
        body: JSON.stringify({ job: jobOrId, profile, interviewer_role: 'all' })
      });
      return handleResponse(res, 'Error al preparar entrevista');
    }
    const id = typeof jobOrId === 'string' ? jobOrId : jobOrId.id;
    const res = await fetch(`${API_BASE}/jobs/${id}/interview-prep`, {
      method: 'POST',
      headers: { ...llmHeaders }
    });
    return handleResponse(res, 'Error al preparar entrevista');
  },
  evaluateInterviewAnswer: async (question: string, answer: string, company?: string, job?: JobPosting, profile?: CandidateProfile) => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/interview/evaluate-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ question, answer, company, job, profile })
    });
    return res.json();
  },

  // Coach IA (Desarrollo y Crecimiento Profesional)
  getCoachDiagnostic: async (profile?: CandidateProfile, jobs?: JobPosting[]): Promise<CompetencyDiagnosticItem[]> => {
    const llmHeaders = await getLLMHeaders();
    if (profile) {
      const res = await fetch(`${API_BASE}/coach/diagnostic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...llmHeaders },
        body: JSON.stringify({ profile, jobs: jobs || [] })
      });
      return handleResponse<CompetencyDiagnosticItem[]>(res, 'Error al generar diagnóstico de competencias');
    }
    const res = await fetch(`${API_BASE}/coach/diagnostic`, {
      headers: { ...llmHeaders }
    });
    return handleResponse<CompetencyDiagnosticItem[]>(res, 'Error al obtener diagnóstico de competencias');
  },
  updateCoachCompetency: async (compId: string, data: Partial<CompetencyDiagnosticItem> & { evidence?: string }): Promise<CompetencyDiagnosticItem> => {
    const res = await fetch(`${API_BASE}/coach/competencies/${compId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<CompetencyDiagnosticItem>(res, 'Error al actualizar competencia');
  },
  syncGapsFromJob: async (jobId: string): Promise<CompetencyDiagnosticItem[]> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/coach/sync-gaps/${jobId}`, {
      method: 'POST',
      headers: { ...llmHeaders }
    });
    return handleResponse<CompetencyDiagnosticItem[]>(res, 'Error al transferir brechas al Coach IA');
  },
  /** Brechas reales: requisitos de tus ofertas guardadas/evaluadas vs. tu CV (sin estado). */
  analyzeGaps: async (
    profile: CandidateProfile,
    jobs: JobPosting[],
    preferences?: UserPreferences | null,
    useAi = true
  ): Promise<GapAnalysis> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/coach/gaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ profile, jobs, preferences: preferences ?? null, use_ai: useAi })
    });
    return handleResponse<GapAnalysis>(res, 'Error al analizar brechas');
  },
  searchCoachCourses: async (params?: { query?: string; competency?: string; cost?: string }): Promise<LearningCourseResource[]> => {
    const sp = new URLSearchParams();
    if (params?.query) sp.set('query', params.query);
    if (params?.competency) sp.set('competency', params.competency);
    if (params?.cost) sp.set('cost', params.cost);
    const res = await fetch(`${API_BASE}/coach/courses?${sp.toString()}`);
    return handleResponse<LearningCourseResource[]>(res, 'Error al buscar cursos verificados');
  },
  generateLearningPath: async (targetRole: string, gaps: string[], profile?: CandidateProfile): Promise<LearningPath> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/coach/learning-path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ target_role: targetRole, gaps, profile })
    });
    return handleResponse<LearningPath>(res, 'Error al generar ruta de aprendizaje');
  },
  getLearningPaths: async (): Promise<LearningPath[]> => {
    const res = await fetch(`${API_BASE}/coach/learning-paths`);
    return handleResponse<LearningPath[]>(res, 'Error al obtener rutas de aprendizaje');
  },
  updateMilestoneStatus: async (pathId: string, stepNumber: number, status: string, evidence?: string): Promise<LearningPath> => {
    const res = await fetch(`${API_BASE}/coach/learning-paths/${pathId}/milestones/${stepNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, evidence })
    });
    return handleResponse<LearningPath>(res, 'Error al actualizar avance de hito');
  },
  generateTutorChallenge: async (competency: string, seniority: string = 'Intermedio', profile?: CandidateProfile): Promise<TutorPracticeChallenge> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/coach/tutor/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ competency, seniority, profile })
    });
    return handleResponse<TutorPracticeChallenge>(res, 'Error al generar desafío práctico');
  },
  evaluateTutorSolution: async (challenge: TutorPracticeChallenge, solution: string, profile?: CandidateProfile): Promise<TutorEvaluationResult> => {
    const llmHeaders = await getLLMHeaders();
    const res = await fetch(`${API_BASE}/coach/tutor/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify({ challenge, solution, profile })
    });
    return handleResponse<TutorEvaluationResult>(res, 'Error al evaluar solución técnica');
  },
  getTargetedInterviewPrep: async (jobOrId: string | JobPosting, interviewerRole: string = 'all', profile?: CandidateProfile): Promise<any> => {
    const llmHeaders = await getLLMHeaders();
    const isObj = typeof jobOrId === 'object';
    const body = isObj
      ? { job: jobOrId, interviewer_role: interviewerRole, profile }
      : { job_id: jobOrId, interviewer_role: interviewerRole, profile };
    const res = await fetch(`${API_BASE}/coach/interview-prep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...llmHeaders },
      body: JSON.stringify(body)
    });
    return handleResponse(res, 'Error al generar preparación de entrevista');
  },

  // Settings & Security Purge
  getSettings: async (): Promise<LLMSettings> => {
    const clientId = getClientId();
    return safeFetchJson<LLMSettings>(`${API_BASE}/settings`, clientId ? { headers: { 'X-Oportia-Client': clientId } } : undefined, {
      provider: 'gemini',
      has_active_key: false,
      active_model_name: '',
      status_label: 'IA no conectada',
      status_color: 'yellow',
      has_gemini_key: false,
      has_openai_key: false,
      has_claude_key: false,
      gemini_model: 'gemini-2.0-flash',
      openai_model: 'gpt-4o',
      claude_model: 'claude-3-5-sonnet-latest'
    });
  },
  updateSettings: async (payload: { provider: string; api_key?: string; model_name?: string }) => {
    // In stateless architecture, we never transmit raw api_key to be saved on the backend disk
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: payload.provider,
        model_name: payload.model_name
      })
    });
    return handleResponse(res, 'Error al actualizar la configuración de IA');
  },
  purgeSettings: async () => {
    const res = await fetch(`${API_BASE}/settings/purge`, {
      method: 'POST'
    });
    return handleResponse(res, 'Error al eliminar configuración');
  },
  purgeAllServerData: async () => {
    const res = await fetch(`${API_BASE}/purge-all`, {
      method: 'POST'
    });
    return handleResponse(res, 'Error al purgar datos del servidor');
  },
  checkLegacyExport: async (): Promise<{
    found: boolean;
    profile?: CandidateProfile;
    preferences?: UserPreferences;
    jobs?: JobPosting[];
    applications?: ApplicationDraft[];
    coach_data?: any;
  }> => {
    return safeFetchJson(`${API_BASE}/legacy-export`, undefined, { found: false });
  }
};
