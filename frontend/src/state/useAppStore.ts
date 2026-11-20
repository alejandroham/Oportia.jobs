import { create } from 'zustand';
import { withChronologicalOrder } from '../utils/cvOrder';
import type {
  CandidateProfile,
  UserPreferences,
  JobPosting,
  ApplicationDraft,
  LLMSettings,
  CoachDataStore,
  CompetencyDiagnosticItem,
  LearningPath
} from '../types';
import { getClientStore, saveClientStore, clearClientStore } from '../utils/storage';
import { hasSharedAIConsent, setSharedAIConsent as persistSharedAIConsent } from '../utils/sharedAI';
import { api } from '../api';

/**
 * Estado de IA derivado: clave propia (sin límite) > IA gratuita de Oportia (con cupo y
 * consentimiento) > sin IA. Toda actualización de settings pasa por aquí.
 */
export function deriveAISettings(s: LLMSettings): LLMSettings {
  const ownKey =
    typeof window !== 'undefined' && !!window.localStorage
      ? Boolean(localStorage.getItem(`job_search_llm_key_${s.provider}`))
      : Boolean(s.has_own_key);
  const consented = hasSharedAIConsent();
  const sharedAvailable = Boolean(s.shared_ai?.available);
  const sharedActive = !ownKey && sharedAvailable && consented;
  const providerName = s.provider.charAt(0).toUpperCase() + s.provider.slice(1);
  return {
    ...s,
    has_own_key: ownKey,
    has_active_key: ownKey || sharedActive,
    status_label: ownKey ? `${providerName} · tu clave` : sharedActive ? 'IA gratuita de Oportia' : 'IA no conectada',
    status_color: ownKey || sharedActive ? 'green' : 'yellow',
    shared_ai: s.shared_ai
      ? {
          ...s.shared_ai,
          consented,
          active: sharedActive,
          // Desde el servidor llega retry_after (segundos); aquí se convierte a una hora límite del navegador.
          busy_until:
            s.shared_ai.state === 'busy' && s.shared_ai.retry_after && !s.shared_ai.busy_until
              ? Date.now() + s.shared_ai.retry_after * 1000
              : s.shared_ai.busy_until
        }
      : s.shared_ai
  };
}

export const DEFAULT_EMPTY_PROFILE: CandidateProfile = {
  name: 'Candidato',
  years_of_experience: 0,
  technical_skills: [],
  soft_skills: [],
  languages: {},
  experiences: [],
  education: [],
  certifications: []
};

export const DEFAULT_EMPTY_PREFERENCES: UserPreferences = {
  preferred_region: undefined,
  preferred_communes: [],
  geographic_scope: 'all',
  remote_only: false,
  target_roles: [],
  preferred_locations: [],
  preferred_technologies: [],
  auto_learned_insights: [],
  min_salary_usd: 0,
  deal_breakers: [],
  learned_star_stories: []
};

export const DEFAULT_EMPTY_COACH_DATA: CoachDataStore = {
  competencies: [],
  learningPaths: [],
  completedChallenges: []
};

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  provider: 'gemini',
  has_active_key: false,
  active_model_name: '',
  status_label: 'IA no conectada',
  status_color: 'yellow',
  has_gemini_key: false,
  has_openai_key: false,
  has_claude_key: false,
  gemini_model: 'gemini-3.6-flash',
  openai_model: 'gpt-6.2-sol',
  claude_model: 'claude-sonnet-5-5'
};

interface AppState {
  // Core state
  profile: CandidateProfile | null;
  preferences: UserPreferences | null;
  jobs: JobPosting[];
  applications: ApplicationDraft[];
  coachData: CoachDataStore;
  settings: LLMSettings;
  activeTab: string;
  darkMode: boolean;
  hasCompletedOnboarding: boolean;
  isInitialized: boolean;
  isLoading: boolean;

  // Actions
  initStore: () => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  setProfile: (profile: CandidateProfile | null) => Promise<void>;
  setPreferences: (preferences: UserPreferences | null) => Promise<void>;
  setJobs: (jobs: JobPosting[]) => Promise<void>;
  addOrUpdateJob: (job: JobPosting) => Promise<void>;
  removeJob: (jobId: string) => Promise<void>;
  setApplications: (applications: ApplicationDraft[]) => Promise<void>;
  addOrUpdateApplication: (application: ApplicationDraft) => Promise<void>;
  removeApplication: (applicationId: string) => Promise<void>;
  updateCoachData: (partial: Partial<CoachDataStore>) => Promise<void>;
  saveCompetency: (comp: CompetencyDiagnosticItem) => Promise<void>;
  saveLearningPath: (path: LearningPath) => Promise<void>;
  setSettings: (settings: LLMSettings) => Promise<void>;
  /** Acepta o retira el aviso de la IA gratuita de Oportia. */
  setSharedAIConsent: (accepted: boolean) => void;
  /** Actualiza el cupo restante informado por el servidor. */
  updateSharedAIRemaining: (remaining: number) => void;
  /** DT-17: la IA gratuita está con demanda durante `seconds` segundos. */
  markSharedAIBusy: (seconds: number) => void;
  /** Vuelve a "disponible" cuando pasa el tiempo de espera. */
  clearSharedAIBusy: () => void;
  /** Vuelve a consultar al servidor si hay IA gratuita y cuánto cupo queda. */
  refreshSharedAI: () => Promise<void>;
  setActiveTab: (tab: string) => void;
  setDarkMode: (darkMode: boolean) => void;
  clearAllLocalData: () => Promise<void>;
  importBackupBundle: (payload: {
    profile?: CandidateProfile | null;
    preferences?: UserPreferences | null;
    jobs?: JobPosting[];
    applications?: ApplicationDraft[];
    coachData?: CoachDataStore;
    /** Conversación con Opi (respaldo formato 1.2). */
    chatHistory?: unknown[];
  }) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  preferences: null,
  jobs: [],
  applications: [],
  coachData: DEFAULT_EMPTY_COACH_DATA,
  settings: DEFAULT_LLM_SETTINGS,
  activeTab: 'welcome',
  darkMode: false,
  hasCompletedOnboarding: false,
  isInitialized: false,
  isLoading: true,

  initStore: async () => {
    try {
      const [
        savedProfile,
        savedPref,
        savedJobs,
        savedApps,
        savedCoach,
        savedSettings,
        savedOnboarding
      ] = await Promise.all([
        getClientStore<CandidateProfile>('profile'),
        getClientStore<UserPreferences>('preferences'),
        getClientStore<JobPosting[]>('jobs'),
        getClientStore<ApplicationDraft[]>('applications'),
        getClientStore<CoachDataStore>('coach_data'),
        getClientStore<LLMSettings>('llm_settings'),
        getClientStore<boolean>('onboarding_completed')
      ]);

      const localOnboarding = typeof window !== 'undefined' && localStorage.getItem('nexusjob_onboarding_completed') === 'true';
      const isCompleted = savedOnboarding === true || localOnboarding || Boolean(savedProfile?.name && savedProfile.name.trim().toLowerCase() !== 'candidato');

      const savedTheme = localStorage.getItem('oportia_theme');
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme !== null ? savedTheme === 'dark' : prefersDark;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      const provider = (localStorage.getItem('job_search_default_provider') || savedSettings?.provider || 'gemini') as 'gemini' | 'openai' | 'claude';
      const hasKey = Boolean(localStorage.getItem(`job_search_llm_key_${provider}`));
      const activeModel = localStorage.getItem(`job_search_llm_model_${provider}`) ||
        (provider === 'gemini' ? (savedSettings?.gemini_model || 'gemini-3.6-flash') :
         provider === 'openai' ? (savedSettings?.openai_model || 'gpt-6.2-sol') :
         (savedSettings?.claude_model || 'claude-sonnet-5-5'));

      const initialSettings: LLMSettings = deriveAISettings({
        provider,
        has_active_key: hasKey,
        active_model_name: activeModel,
        status_label: hasKey ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} (${activeModel})` : 'IA no conectada',
        status_color: hasKey ? 'green' : 'yellow',
        has_gemini_key: Boolean(localStorage.getItem('job_search_llm_key_gemini')),
        has_openai_key: Boolean(localStorage.getItem('job_search_llm_key_openai')),
        has_claude_key: Boolean(localStorage.getItem('job_search_llm_key_claude')),
        gemini_model: localStorage.getItem('job_search_llm_model_gemini') || savedSettings?.gemini_model || 'gemini-3.6-flash',
        openai_model: localStorage.getItem('job_search_llm_model_openai') || savedSettings?.openai_model || 'gpt-6.2-sol',
        claude_model: localStorage.getItem('job_search_llm_model_claude') || savedSettings?.claude_model || 'claude-sonnet-5-5',
        available_models: savedSettings?.available_models,
        shared_ai: undefined
      });

      set({
        profile: savedProfile ? withChronologicalOrder(savedProfile) : null,
        preferences: savedPref || null,
        jobs: Array.isArray(savedJobs) ? savedJobs : [],
        applications: Array.isArray(savedApps) ? savedApps : [],
        coachData: savedCoach || DEFAULT_EMPTY_COACH_DATA,
        settings: initialSettings,
        darkMode: isDark,
        hasCompletedOnboarding: isCompleted,
        isInitialized: true,
        isLoading: false
      });

      // Catálogo de modelos e IA gratuita del servidor (asíncrono)
      get().refreshSharedAI();
    } catch (e) {
      console.warn('[useAppStore] Error al inicializar store desde IndexedDB:', e);
      set({ isInitialized: true, isLoading: false });
    }
  },

  setOnboardingCompleted: async (completed: boolean) => {
    await saveClientStore('onboarding_completed', completed);
    set({ hasCompletedOnboarding: completed });
  },

  setProfile: async (rawProfile) => {
    // Experiencia y educación por fecha (lo más reciente primero), salvo orden manual.
    const profile = rawProfile ? withChronologicalOrder(rawProfile) : rawProfile;
    set({ profile });
    if (profile) {
      await saveClientStore('profile', profile);
    }
  },

  setPreferences: async (preferences) => {
    set({ preferences });
    if (preferences) {
      await saveClientStore('preferences', preferences);
    }
  },

  setJobs: async (jobs) => {
    set({ jobs });
    await saveClientStore('jobs', jobs);
  },

  addOrUpdateJob: async (job) => {
    const currentJobs = get().jobs;
    const existsIndex = currentJobs.findIndex(
      (j) => j.id === job.id || (j.url && job.url && j.url.toLowerCase() === job.url.toLowerCase())
    );
    let updatedJobs: JobPosting[];
    if (existsIndex >= 0) {
      updatedJobs = [...currentJobs];
      updatedJobs[existsIndex] = { ...updatedJobs[existsIndex], ...job };
    } else {
      updatedJobs = [job, ...currentJobs];
    }
    set({ jobs: updatedJobs });
    await saveClientStore('jobs', updatedJobs);
  },

  removeJob: async (jobId) => {
    const updatedJobs = get().jobs.filter((j) => j.id !== jobId);
    set({ jobs: updatedJobs });
    await saveClientStore('jobs', updatedJobs);
  },

  setApplications: async (applications) => {
    set({ applications });
    await saveClientStore('applications', applications);
  },

  addOrUpdateApplication: async (application) => {
    const current = get().applications;
    const existsIndex = current.findIndex((a) => a.id === application.id);
    let updated: ApplicationDraft[];
    if (existsIndex >= 0) {
      updated = [...current];
      updated[existsIndex] = { ...updated[existsIndex], ...application };
    } else {
      updated = [application, ...current];
    }
    set({ applications: updated });
    await saveClientStore('applications', updated);
  },

  removeApplication: async (applicationId) => {
    const updated = get().applications.filter((a) => a.id !== applicationId);
    set({ applications: updated });
    await saveClientStore('applications', updated);
  },

  updateCoachData: async (partial) => {
    const current = get().coachData;
    const updated: CoachDataStore = {
      ...current,
      ...partial
    };
    set({ coachData: updated });
    await saveClientStore('coach_data', updated);
  },

  saveCompetency: async (comp) => {
    const current = get().coachData;
    const comps = current.competencies.filter((c) => c.id !== comp.id && c.name.toLowerCase() !== comp.name.toLowerCase());
    comps.push(comp);
    await get().updateCoachData({ competencies: comps });
  },

  saveLearningPath: async (path) => {
    const current = get().coachData;
    const paths = current.learningPaths.filter((p) => p.id !== path.id);
    paths.push(path);
    await get().updateCoachData({ learningPaths: paths });
  },

  setSettings: async (settings) => {
    const derived = deriveAISettings({ ...settings, shared_ai: settings.shared_ai ?? get().settings.shared_ai });
    set({ settings: derived });
    await saveClientStore('llm_settings', derived);
  },

  setSharedAIConsent: (accepted) => {
    persistSharedAIConsent(accepted);
    set((state) => ({ settings: deriveAISettings(state.settings) }));
  },

  markSharedAIBusy: (seconds) => {
    set((state) =>
      state.settings.shared_ai
        ? { settings: deriveAISettings({ ...state.settings, shared_ai: { ...state.settings.shared_ai, state: 'busy', retry_after: seconds, busy_until: Date.now() + seconds * 1000 } }) }
        : {}
    );
  },

  clearSharedAIBusy: () => {
    set((state) =>
      state.settings.shared_ai
        ? { settings: deriveAISettings({ ...state.settings, shared_ai: { ...state.settings.shared_ai, state: 'ok', retry_after: 0, busy_until: undefined } }) }
        : {}
    );
  },

  updateSharedAIRemaining: (remaining) => {
    set((state) =>
      state.settings.shared_ai
        ? { settings: deriveAISettings({ ...state.settings, shared_ai: { ...state.settings.shared_ai, remaining } }) }
        : {}
    );
  },

  refreshSharedAI: async () => {
    try {
      const backend = await api.getSettings();
      set((state) => ({
        settings: deriveAISettings({
          ...state.settings,
          available_models: backend?.available_models || state.settings.available_models,
          shared_ai: backend?.shared_ai
        })
      }));
    } catch {
      /* sin backend: se mantiene el estado local */
    }
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setDarkMode: (darkMode) => {
    set({ darkMode });
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('oportia_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('oportia_theme', 'light');
    }
  },

  clearAllLocalData: async () => {
    await clearClientStore();
    set({
      profile: null,
      preferences: null,
      jobs: [],
      applications: [],
      coachData: DEFAULT_EMPTY_COACH_DATA,
      settings: DEFAULT_LLM_SETTINGS,
      hasCompletedOnboarding: false,
      activeTab: 'welcome'
    });
  },

  importBackupBundle: async (payload) => {
    const profile = payload.profile ? withChronologicalOrder(payload.profile) : null;
    const preferences = payload.preferences || null;
    const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    const applications = Array.isArray(payload.applications) ? payload.applications : [];
    const coachData = payload.coachData || DEFAULT_EMPTY_COACH_DATA;

    set({
      profile,
      preferences,
      jobs,
      applications,
      coachData
    });

    await Promise.all([
      profile ? saveClientStore('profile', profile) : Promise.resolve(),
      preferences ? saveClientStore('preferences', preferences) : Promise.resolve(),
      saveClientStore('jobs', jobs),
      saveClientStore('applications', applications),
      saveClientStore('coach_data', coachData),
      Array.isArray(payload.chatHistory) && payload.chatHistory.length
        ? saveClientStore('oportia_chat_history', payload.chatHistory)
        : Promise.resolve()
    ]);
  }
}));
