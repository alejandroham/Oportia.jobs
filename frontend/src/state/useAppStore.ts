import { create } from 'zustand';
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
  gemini_model: 'gemini-2.0-flash',
  openai_model: 'gpt-4o',
  claude_model: 'claude-3-5-sonnet-latest'
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
  isInitialized: boolean;
  isLoading: boolean;

  // Actions
  initStore: () => Promise<void>;
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
  setActiveTab: (tab: string) => void;
  setDarkMode: (darkMode: boolean) => void;
  clearAllLocalData: () => Promise<void>;
  importBackupBundle: (payload: {
    profile?: CandidateProfile | null;
    preferences?: UserPreferences | null;
    jobs?: JobPosting[];
    applications?: ApplicationDraft[];
    coachData?: CoachDataStore;
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
        savedSettings
      ] = await Promise.all([
        getClientStore<CandidateProfile>('profile'),
        getClientStore<UserPreferences>('preferences'),
        getClientStore<JobPosting[]>('jobs'),
        getClientStore<ApplicationDraft[]>('applications'),
        getClientStore<CoachDataStore>('coach_data'),
        getClientStore<LLMSettings>('llm_settings')
      ]);

      const savedTheme = localStorage.getItem('oportia_theme');
      const isDark = savedTheme === 'dark';
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      const provider = (localStorage.getItem('job_search_default_provider') || savedSettings?.provider || 'gemini') as 'gemini' | 'openai' | 'claude';
      const hasKey = Boolean(localStorage.getItem(`job_search_llm_key_${provider}`));
      const activeModel = localStorage.getItem(`job_search_llm_model_${provider}`) ||
        (provider === 'gemini' ? (savedSettings?.gemini_model || 'gemini-2.0-flash') :
         provider === 'openai' ? (savedSettings?.openai_model || 'gpt-4o') :
         (savedSettings?.claude_model || 'claude-3-5-sonnet-latest'));

      const initialSettings: LLMSettings = {
        provider,
        has_active_key: hasKey,
        active_model_name: activeModel,
        status_label: hasKey ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} (${activeModel})` : 'IA no conectada',
        status_color: hasKey ? 'green' : 'yellow',
        has_gemini_key: Boolean(localStorage.getItem('job_search_llm_key_gemini')),
        has_openai_key: Boolean(localStorage.getItem('job_search_llm_key_openai')),
        has_claude_key: Boolean(localStorage.getItem('job_search_llm_key_claude')),
        gemini_model: localStorage.getItem('job_search_llm_model_gemini') || savedSettings?.gemini_model || 'gemini-2.0-flash',
        openai_model: localStorage.getItem('job_search_llm_model_openai') || savedSettings?.openai_model || 'gpt-4o',
        claude_model: localStorage.getItem('job_search_llm_model_claude') || savedSettings?.claude_model || 'claude-3-5-sonnet-latest',
        available_models: savedSettings?.available_models
      };

      set({
        profile: savedProfile || null,
        preferences: savedPref || null,
        jobs: Array.isArray(savedJobs) ? savedJobs : [],
        applications: Array.isArray(savedApps) ? savedApps : [],
        coachData: savedCoach || DEFAULT_EMPTY_COACH_DATA,
        settings: initialSettings,
        darkMode: isDark,
        isInitialized: true,
        isLoading: false
      });

      // Update backend models catalog asynchronously
      fetch('/api/settings').then(res => res.json()).then(backendSettings => {
        if (backendSettings?.available_models) {
          set(state => ({
            settings: {
              ...state.settings,
              available_models: backendSettings.available_models
            }
          }));
        }
      }).catch(() => {});
    } catch (e) {
      console.warn('[useAppStore] Error al inicializar store desde IndexedDB:', e);
      set({ isInitialized: true, isLoading: false });
    }
  },

  setProfile: async (profile) => {
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
    set({ settings });
    await saveClientStore('llm_settings', settings);
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
      activeTab: 'welcome'
    });
  },

  importBackupBundle: async (payload) => {
    const profile = payload.profile || null;
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
      saveClientStore('coach_data', coachData)
    ]);
  }
}));
