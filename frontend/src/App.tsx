import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { JobRadar } from './components/JobRadar';
import { PipelineTracker } from './components/PipelineTracker';
import { ProfileStudio } from './components/ProfileStudio';
import { ApplicationStudio } from './components/ApplicationStudio';
import { PreferencesCenter } from './components/PreferencesCenter';
import { CoachStudio } from './components/CoachStudio';
import { Footer } from './components/Footer';
import { SettingsModal } from './components/SettingsModal';
import { SessionPrivacyModal } from './components/SessionPrivacyModal';
import { WelcomeHub } from './components/WelcomeHub';
import { MemoryChat } from './components/MemoryChat';
import { Brain, X } from 'lucide-react';
import { useToast } from './components/Toast';
import type {
  CandidateProfile,
  UserPreferences,
  JobPosting,
  ApplicationDraft,
  LLMSettings
} from './types';
import { api } from './api';
import {
  saveClientStore,
  getClientStore,
  clearClientStore
} from './utils/storage';

// Error Boundary to prevent any unhandled render errors from causing a black screen
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('UI Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center max-w-md mx-auto my-12 rounded-3xl bg-white/90 dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-md space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Ocurrió un problema al mostrar esta sección</h3>
            <p className="text-xs text-gray-500 mt-1">
              {this.state.error?.message || 'Error inesperado al renderizar el componente.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            Recargar sección
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_EMPTY_PROFILE: CandidateProfile = {
  name: '',
  years_of_experience: 0,
  technical_skills: [],
  soft_skills: [],
  languages: {},
  experiences: [],
  education: [],
  certifications: []
};

const DEFAULT_EMPTY_PREFERENCES: UserPreferences = {
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

export function App() {
  const [activeTab, setActiveTab] = useState<string>('welcome');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('oportia_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return false; // Modo día es el tema predeterminado para usuarios nuevos
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [isOpiChatOpen, setIsOpiChatOpen] = useState<boolean>(false);

  // Core state
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<ApplicationDraft[]>([]);
  const [settings, setSettings] = useState<LLMSettings>({
    provider: 'gemini',
    has_active_key: false,
    active_model_name: '',
    status_label: 'IA no conectada',
    status_color: 'yellow',
    has_gemini_key: false,
    has_openai_key: false,
    has_claude_key: false,
    gemini_model: 'gemini-3.5-flash',
    openai_model: 'gpt-4o',
    claude_model: 'claude-3-5-sonnet-20241022'
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Sync dark mode class on document and persist preference
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('oportia_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('oportia_theme', 'light');
    }
  }, [darkMode]);

  // Initial load: Check client-side IndexedDB first (Zero-Knowledge Sovereign Storage)
  const loadData = async () => {
    try {
      // 1. Always load server settings for LLM connectivity
      const s = await api.getSettings().catch(() => settings);
      setSettings(s);

      // 2. Check local browser storage (IndexedDB)
      const [cachedProfile, cachedPrefs, cachedJobs, cachedApps] = await Promise.all([
        getClientStore<CandidateProfile>('profile'),
        getClientStore<UserPreferences>('preferences'),
        getClientStore<JobPosting[]>('jobs'),
        getClientStore<ApplicationDraft[]>('applications')
      ]);

      const hasCachedData = Boolean(
        (cachedProfile?.name && cachedProfile.name.trim() !== '' && cachedProfile.name !== 'Candidato' && ((cachedProfile.experiences && cachedProfile.experiences.length > 0) || (cachedProfile.technical_skills && cachedProfile.technical_skills.length > 0))) ||
        (cachedJobs && cachedJobs.length > 0) ||
        (cachedApps && cachedApps.length > 0)
      );

      if (cachedProfile || cachedJobs || cachedApps) {
        // Use sovereign client storage
        setProfile(cachedProfile);
        setPreferences(cachedPrefs);
        setJobs(cachedJobs || []);
        setApplications(cachedApps || []);
        if (hasCachedData) {
          setActiveTab('radar');
        } else {
          setActiveTab('welcome');
        }
      } else {
        // First session on this device: fallback to server-seed
        const [p, prefs, j, apps] = await Promise.all([
          api.getProfile().catch(() => null),
          api.getPreferences().catch(() => null),
          api.getJobs().catch(() => []),
          api.getApplications().catch(() => [])
        ]);

        setProfile(p);
        setPreferences(prefs);
        setJobs(j || []);
        setApplications(apps || []);

        const hasServerData = Boolean(
          (p?.name && p.name.trim() !== '' && p.name !== 'Candidato' && ((p.experiences && p.experiences.length > 0) || (p.technical_skills && p.technical_skills.length > 0))) ||
          (j && j.length > 0) ||
          (apps && apps.length > 0)
        );

        if (hasServerData) {
          setActiveTab('radar');
        } else {
          setActiveTab('welcome');
        }

        // Seed client store
        if (p) saveClientStore('profile', p);
        if (prefs) saveClientStore('preferences', prefs);
        if (j) saveClientStore('jobs', j);
        if (apps) saveClientStore('applications', apps);
      }
    } catch (e) {
      console.error('Error loading initial data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Safety fallback: ensure loading spinner never blocks the user if network/API hangs
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Auto-sync state changes to client-side IndexedDB
  useEffect(() => {
    if (profile && !loading) {
      saveClientStore('profile', profile);
    }
  }, [profile, loading]);

  useEffect(() => {
    if (preferences && !loading) {
      saveClientStore('preferences', preferences);
    }
  }, [preferences, loading]);

  useEffect(() => {
    if (!loading) {
      saveClientStore('jobs', jobs);
    }
  }, [jobs, loading]);

  useEffect(() => {
    if (!loading) {
      saveClientStore('applications', applications);
    }
  }, [applications, loading]);

  const toast = useToast();

  const handleApplyToJob = async (job: JobPosting) => {
    try {
      setActiveTab('tracker');
      const draft = await api.applyJob(job.id);
      const updatedApps = [draft, ...applications.filter(a => a.job_id !== job.id)];
      setApplications(updatedApps);
      saveClientStore('applications', updatedApps);

      const updatedJobs = await api.getJobs();
      setJobs(updatedJobs);
      saveClientStore('jobs', updatedJobs);

      toast.success('CV y carta adaptados exitosamente', job.title);
    } catch (e: any) {
      toast.error('Error al adaptar CV: ' + (e?.message || e));
    }
  };

  const handleRestoreData = async (bundle: {
    profile: CandidateProfile | null;
    preferences: UserPreferences | null;
    jobs: JobPosting[];
    applications: ApplicationDraft[];
  }) => {
    setProfile(bundle.profile);
    setPreferences(bundle.preferences);
    setJobs(bundle.jobs);
    setApplications(bundle.applications);

    await Promise.all([
      saveClientStore('profile', bundle.profile),
      saveClientStore('preferences', bundle.preferences),
      saveClientStore('jobs', bundle.jobs),
      saveClientStore('applications', bundle.applications)
    ]);

    // Sync to backend so LLM pipelines have context
    if (bundle.profile) {
      try {
        await api.updateProfile(bundle.profile);
      } catch (err) {
        console.warn('Backend profile sync error:', err);
      }
    }
    if (bundle.preferences) {
      try {
        await api.updatePreferences(bundle.preferences);
      } catch (err) {
        console.warn('Backend preferences sync error:', err);
      }
    }
  };

  const handlePurgeData = async () => {
    try {
      await api.purgeSettings().catch(() => {});
      await api.purgeAllServerData().catch(() => {});
    } catch (e) {
      console.warn('Error purging backend:', e);
    }
    setProfile({
      name: '',
      years_of_experience: 0,
      technical_skills: [],
      soft_skills: [],
      languages: {},
      experiences: [],
      education: [],
      certifications: []
    });
    setPreferences(null);
    setJobs([]);
    setApplications([]);
    setSettings({
      provider: 'gemini',
      has_active_key: false,
      active_model_name: '',
      status_label: 'IA no conectada',
      status_color: 'yellow',
      has_gemini_key: false,
      has_openai_key: false,
      has_claude_key: false,
      gemini_model: 'gemini-3.5-flash',
      openai_model: 'gpt-4o',
      claude_model: 'claude-3-5-sonnet-20241022'
    });
    await clearClientStore();
    setActiveTab('welcome');
    setIsPrivacyOpen(false);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors duration-300">
      
      {/* Apple Frosted Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        openSettings={() => setIsSettingsOpen(true)}
        openPrivacyModal={() => setIsPrivacyOpen(true)}
        llmSettings={settings}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <img
              src="/oportia-icon.svg"
              alt="Oportia Jobs IA"
              className="w-14 h-14 rounded-2xl shadow-xl shadow-[#20A88A]/20 animate-pulse object-contain"
            />
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full border-2 border-[#20A88A] border-t-transparent animate-spin" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Iniciando Oportia Jobs IA...</p>
            </div>
          </div>
        ) : (
          <ErrorBoundary>
            <div className="animate-fade-in">
              {activeTab === 'welcome' && (
                <WelcomeHub
                  profile={profile}
                  llmSettings={settings}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  onOpenPrivacyModal={() => setIsPrivacyOpen(true)}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onUploadCVClick={() => setActiveTab('profile')}
                />
              )}

              {activeTab === 'radar' && (
                <JobRadar
                  jobs={jobs}
                  profile={profile}
                  hasActiveKey={Boolean(settings.has_active_key)}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onRefresh={async () => {
                    const updated = await api.getJobs();
                    setJobs(updated);
                    const updatedPrefs = await api.getPreferences();
                    setPreferences(updatedPrefs);
                  }}
                  onApply={handleApplyToJob}
                  onNavigateToTracker={() => setActiveTab('tracker')}
                  onNavigateToTab={(t) => setActiveTab(t)}
                />
              )}

              {activeTab === 'tracker' && (
                <PipelineTracker
                  jobs={jobs}
                  applications={applications}
                  profile={profile}
                  onRefresh={async () => {
                    const updated = await api.getJobs();
                    setJobs(updated);
                    const updatedPrefs = await api.getPreferences();
                    setPreferences(updatedPrefs);
                  }}
                  onApply={handleApplyToJob}
                />
              )}

              {activeTab === 'coach' && (
                <CoachStudio
                  profile={profile}
                  jobs={jobs}
                  llmSettings={settings}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onNavigateToTab={(t) => setActiveTab(t)}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileStudio
                  profile={profile || DEFAULT_EMPTY_PROFILE}
                  onProfileUpdated={(p) => setProfile(p)}
                />
              )}

              {activeTab === 'applications' && (
                <ApplicationStudio applications={applications} />
              )}

              {activeTab === 'preferences' && (
                <PreferencesCenter
                  onPreferencesUpdated={(p) => setPreferences(p)}
                  preferences={preferences || DEFAULT_EMPTY_PREFERENCES}
                  llmSettings={settings}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              )}
            </div>
          </ErrorBoundary>
        )}
      </main>

      {/* Global Apple-styled Footer with Instagram & Sponsor CTA */}
      <Footer onNavigateToTab={(tab) => setActiveTab(tab)} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsUpdated={(s) => setSettings(s)}
      />

      {/* Sovereign Session & Privacy Exit Modal */}
      <SessionPrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        profile={profile}
        preferences={preferences}
        jobs={jobs}
        applications={applications}
        onRestoreData={handleRestoreData}
        onPurgeData={handlePurgeData}
        onGoToWelcome={() => setActiveTab('welcome')}
      />

      {/* Floating Opi Copilot Button (Ergonomic Cupertino Placement above iOS tab bar) */}
      <div className="no-print fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={() => setIsOpiChatOpen(!isOpiChatOpen)}
          className="flex items-center space-x-2.5 px-4 py-2.5 min-h-[44px] rounded-full bg-gradient-to-tr from-[#173B50] via-[#1E3B50] to-[#20A88A] hover:opacity-95 text-white font-semibold text-xs shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition duration-200 border border-white/20 cursor-pointer"
          title="Abrir chat con Opi, tu copiloto profesional"
        >
          <img
            src="/opi-avatar.svg"
            alt="Opi"
            className="w-5 h-5 rounded-full object-cover shrink-0"
          />
          <span>Opi Copiloto</span>
        </button>
      </div>

      {/* Global Opi Copilot Slide-over Drawer */}
      {isOpiChatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in no-print">
          <div className="w-full max-w-xl h-full apple-glass bg-white/95 dark:bg-[#1E3B50]/95 shadow-2xl flex flex-col border-l border-black/10 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-[#173B50]/50">
              <div className="flex items-center space-x-3">
                <img
                  src="/opi-avatar.svg"
                  alt="Opi"
                  className="w-9 h-9 rounded-2xl object-cover shadow-xs border border-[#20A88A]/40 shrink-0"
                />
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Opi — Tu copiloto profesional
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-300">
                    La IA organiza y te orienta. Tú decides tu camino.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpiChatOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-3 overflow-hidden flex flex-col">
              <MemoryChat
                preferences={preferences || DEFAULT_EMPTY_PREFERENCES}
                onPreferencesUpdated={(updated) => {
                  setPreferences(updated);
                  saveClientStore('preferences', updated);
                }}
                llmSettings={settings}
                onOpenSettings={() => setIsSettingsOpen(true)}
                className="h-full flex-1 min-h-0"
              />
            </div>
          </div>
        </div>
      )}

    </div>
    </ErrorBoundary>
  );
}

export default App;
