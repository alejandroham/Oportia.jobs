import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { JobRadar } from './components/JobRadar';
import { PipelineTracker } from './components/PipelineTracker';
import { CoachStudio } from './components/CoachStudio';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { WelcomeHub } from './components/WelcomeHub';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { Footer } from './components/Footer';
import { MemoryChat } from './components/MemoryChat';
import { X } from 'lucide-react';
import { useToast } from './components/Toast';
import { api } from './api';
import type { JobPosting } from './types';
import {
  useAppStore,
  DEFAULT_EMPTY_PROFILE,
  DEFAULT_EMPTY_PREFERENCES
} from './state/useAppStore';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4">
          <h2 className="text-lg font-bold text-red-600">Algo salió mal</h2>
          <pre className="text-xs text-gray-500 bg-gray-100 dark:bg-zinc-800 p-4 rounded-xl overflow-auto max-w-xl mx-auto">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
          >
            Recargar aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const navigate = useNavigate();
  const {
    profile,
    setProfile,
    preferences,
    setPreferences,
    jobs,
    addOrUpdateJob,
    applications,
    addOrUpdateApplication,
    settings,
    hasCompletedOnboarding,
    setOnboardingCompleted,
    isLoading,
    initStore,
    importBackupBundle
  } = useAppStore();

  const [isOpiChatOpen, setIsOpiChatOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const toast = useToast();

  // Auto-open onboarding on first visit once store initialized
  useEffect(() => {
    if (!isLoading && !hasCompletedOnboarding) {
      setIsOnboardingOpen(true);
    }
  }, [isLoading, hasCompletedOnboarding]);

  useEffect(() => {
    const init = async () => {
      await initStore();
      const currentProfile = useAppStore.getState().profile;
      if (!currentProfile || !currentProfile.name || currentProfile.name.trim().toLowerCase() === 'candidato') {
        try {
          const legacy = await api.checkLegacyExport();
          if (legacy?.found && legacy.profile) {
            await importBackupBundle({
              profile: legacy.profile,
              preferences: legacy.preferences,
              jobs: legacy.jobs,
              applications: legacy.applications,
              coachData: legacy.coach_data
            });
            toast.info('Se migraron tus datos previos del equipo al almacenamiento seguro del navegador.');
          }
        } catch (e) {
          console.warn('Error al verificar exportación legacy:', e);
        }
      }
    };
    init();
  }, [initStore, importBackupBundle, toast]);

  // Unified navigation helper translating legacy tab keys to declarative routes
  const handleNavigate = (target: string) => {
    const routeMap: Record<string, string> = {
      welcome: '/',
      radar: '/empleos',
      tracker: '/postulaciones',
      coach: '/aprender',
      profile: '/perfil',
      preferences: '/perfil?tab=busqueda',
      settings: '/ajustes'
    };
    const dest = routeMap[target] || target;
    navigate(dest);
  };

  const handleApplyToJob = async (job: JobPosting) => {
    try {
      navigate('/postulaciones');
      const draft = await api.applyJob(job.id);
      await addOrUpdateApplication(draft);

      const updatedJob: JobPosting = {
        ...job,
        status: 'applied',
        applied_date: new Date().toISOString()
      };
      await addOrUpdateJob(updatedJob);

      toast.success('CV y carta adaptados exitosamente', job.title);
    } catch (e: any) {
      toast.error('Error al adaptar CV: ' + (e?.message || e));
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors duration-300">
        {/* Apple Frosted Navbar with 5 semantic tabs + AI status indicator */}
        <Navbar llmSettings={settings} />

        {/* Main Routed Content Area */}
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
              <img
                src="/oportia-icon.svg"
                alt="Oportia Jobs IA"
                className="w-14 h-14 rounded-2xl shadow-xl shadow-[#20A88A]/20 animate-pulse object-contain"
              />
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border-2 border-[#20A88A] border-t-transparent animate-spin" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Iniciando Oportia Jobs IA...
                </p>
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              <div className="animate-fade-in">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <WelcomeHub
                        profile={profile}
                        llmSettings={settings}
                        onNavigateToTab={handleNavigate}
                        onOpenPrivacyModal={() => navigate('/ajustes')}
                        onOpenSettings={() => navigate('/ajustes')}
                        onUploadCVClick={() => navigate('/perfil')}
                        onOpenOnboarding={() => setIsOnboardingOpen(true)}
                      />
                    }
                  />

                  <Route
                    path="/empleos"
                    element={
                      <JobRadar
                        jobs={jobs}
                        profile={profile}
                        hasActiveKey={Boolean(settings.has_active_key)}
                        onOpenSettings={() => navigate('/ajustes')}
                        onRefresh={async () => {}}
                        onApply={handleApplyToJob}
                        onNavigateToTracker={() => navigate('/postulaciones')}
                        onNavigateToTab={handleNavigate}
                      />
                    }
                  />

                  <Route
                    path="/postulaciones"
                    element={
                      <PipelineTracker
                        jobs={jobs}
                        applications={applications}
                        profile={profile}
                        onRefresh={async () => {}}
                        onApply={handleApplyToJob}
                      />
                    }
                  />

                  <Route
                    path="/aprender"
                    element={
                      <CoachStudio
                        profile={profile}
                        jobs={jobs}
                        llmSettings={settings}
                        onOpenSettings={() => navigate('/ajustes')}
                        onNavigateToTab={handleNavigate}
                      />
                    }
                  />

                  <Route
                    path="/perfil"
                    element={
                      <ProfileView
                        profile={profile || DEFAULT_EMPTY_PROFILE}
                        onProfileUpdated={setProfile}
                        preferences={preferences || DEFAULT_EMPTY_PREFERENCES}
                        onPreferencesUpdated={setPreferences}
                        llmSettings={settings}
                        onOpenSettings={() => navigate('/ajustes')}
                      />
                    }
                  />

                  <Route path="/ajustes" element={<SettingsView />} />

                  {/* Catch-all redirect to Inicio */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </ErrorBoundary>
          )}
        </main>

        {/* Global Apple-styled Footer with Instagram & Sponsor CTA */}
        <Footer onNavigateToTab={handleNavigate} />

        {/* Floating Opi Copilot Button (Ergonomic placement above bottom tab bar on mobile) */}
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

        {/* Global Opi Copilot Slide-over Drawer (The ONLY conversational Opi access) */}
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
                  onPreferencesUpdated={(updated) => setPreferences(updated)}
                  llmSettings={settings}
                  onOpenSettings={() => {
                    setIsOpiChatOpen(false);
                    navigate('/ajustes');
                  }}
                  className="h-full flex-1 min-h-0"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3-Step Guided Onboarding Wizard */}
        <OnboardingWizard
          isOpen={isOnboardingOpen}
          onClose={() => {
            setIsOnboardingOpen(false);
            setOnboardingCompleted(true);
          }}
          onFinished={() => {
            setIsOnboardingOpen(false);
            navigate('/empleos');
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
