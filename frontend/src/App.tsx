import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { JobRadar } from './components/JobRadar';
import { PipelineTracker } from './components/PipelineTracker';
import { ProfileStudio } from './components/ProfileStudio';
import { ApplicationStudio } from './components/ApplicationStudio';
import { PreferencesCenter } from './components/PreferencesCenter';
import { SettingsModal } from './components/SettingsModal';
import { SessionPrivacyModal } from './components/SessionPrivacyModal';
import { WelcomeHub } from './components/WelcomeHub';
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

export function App() {
  const [activeTab, setActiveTab] = useState<string>('radar');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);

  // Core state
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<ApplicationDraft[]>([]);
  const [settings, setSettings] = useState<LLMSettings>({
    provider: 'gemini',
    has_gemini_key: false,
    has_openai_key: false,
    has_claude_key: false,
    gemini_model: 'gemini-3.5-flash',
    openai_model: 'gpt-4o',
    claude_model: 'claude-3-5-sonnet-20241022'
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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

      if (cachedProfile || cachedJobs || cachedApps) {
        // Use sovereign client storage
        setProfile(cachedProfile);
        setPreferences(cachedPrefs);
        setJobs(cachedJobs || []);
        setApplications(cachedApps || []);
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
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-xs text-gray-400">Iniciando Agente Autónomo NexusJob AI...</p>
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
                  onRefresh={async () => {
                    const updated = await api.getJobs();
                    setJobs(updated);
                    const updatedPrefs = await api.getPreferences();
                    setPreferences(updatedPrefs);
                  }}
                  onApply={handleApplyToJob}
                  onNavigateToTracker={() => setActiveTab('tracker')}
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

              {activeTab === 'profile' && profile && (
                <ProfileStudio
                  profile={profile}
                  onProfileUpdated={(p) => setProfile(p)}
                />
              )}

              {activeTab === 'applications' && (
                <ApplicationStudio applications={applications} />
              )}

              {activeTab === 'preferences' && preferences && (
                <PreferencesCenter
                  onPreferencesUpdated={(p) => setPreferences(p)}
                  preferences={preferences}
                />
              )}
            </div>
          </ErrorBoundary>
        )}
      </main>

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

    </div>
  );
}

export default App;
