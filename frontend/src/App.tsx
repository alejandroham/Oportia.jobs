import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { JobSearchPage } from './features/empleos/JobSearchPage';
import { ApplicationsPage } from './features/postulaciones/ApplicationsPage';
import { LearnPage } from './features/aprender/LearnPage';
import { ProfilePage } from './features/perfil/ProfilePage';
import { SettingsView } from './components/SettingsView';
import { LegalPage } from './features/legal/LegalPage';
import { NotFoundPage } from './components/NotFoundPage';
import { WelcomeHub } from './components/WelcomeHub';
import { LandingPage } from './components/landing/LandingPage';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { FeedbackDialog } from './components/feedback/FeedbackDialog';
import { FeedbackCard } from './components/feedback/FeedbackCard';
import { RestoreDataDialog } from './components/settings/RestoreDataDialog';
import { CvRequiredGate } from './components/common/CvRequiredGate';
import { hasCvLoaded } from './utils/profileState';
import { PURGED_FLAG } from './components/settings/SettingsPrivacyPanel';
import { useFeedbackStore } from './state/useFeedbackStore';
import { addUsageMinute, markPrompted, shouldPrompt } from './utils/feedbackPrompt';
import { Footer } from './components/Footer';
import { MemoryChat } from './components/MemoryChat';
import { OpiAvatar } from './components/ui/OpiAvatar';
import { X } from 'lucide-react';
import { useToast } from './components/Toast';
import { api } from './api';
import { onSharedAIRemaining, onSharedAIBusy } from './utils/sharedAI';
import { migrateApiKeysToDeviceKey } from './utils/crypto';
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
          <pre className="text-xs text-gray-500 bg-gray-100 dark:bg-ink-raised p-4 rounded-xl overflow-auto max-w-xl mx-auto">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
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
  const location = useLocation();
  const {
    profile,
    setProfile,
    preferences,
    setPreferences,
    jobs,
    addOrUpdateJob,
    applications,
    settings,
    hasCompletedOnboarding,
    setOnboardingCompleted,
    isLoading,
    initStore,
    importBackupBundle
  } = useAppStore();

  const [isOpiChatOpen, setIsOpiChatOpen] = useState<boolean>(false);
  const hasCv = hasCvLoaded(profile);
  const isLandingVisible =
    !isLoading && (location.pathname === '/conoce-oportia' || (location.pathname === '/' && !hasCompletedOnboarding));
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const toast = useToast();

  // Invitación a opinar: tarjeta pequeña en una esquina tras 4-8 minutos de uso real (pestaña visible),
  // nunca encima de la guía, la portada ni el chat. Ver utils/feedbackPrompt.ts.
  const isFeedbackOpen = useFeedbackStore((st) => st.isOpen);
  const promptBlocked = useRef(false);
  const [showFeedbackCard, setShowFeedbackCard] = useState(false);
  promptBlocked.current = isLandingVisible || isOnboardingOpen || isOpiChatOpen || isFeedbackOpen;
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const minutes = addUsageMinute();
      if (!promptBlocked.current && shouldPrompt(minutes)) {
        markPrompted(minutes);
        setShowFeedbackCard(true);
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Aviso tras "Borrar todos mis datos" (la app se recargó en la página principal).
  useEffect(() => {
    if (sessionStorage.getItem(PURGED_FLAG)) {
      sessionStorage.removeItem(PURGED_FLAG);
      toast.success('Tus datos fueron borrados de este navegador. Puedes empezar de nuevo cuando quieras.', 'Listo');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cupo de la IA gratuita: el servidor lo informa en cada respuesta que usa IA.
  useEffect(() => onSharedAIRemaining((n) => useAppStore.getState().updateSharedAIRemaining(n)), []);
  useEffect(() => onSharedAIBusy((s) => useAppStore.getState().markSharedAIBusy(s)), []);
  // Cuando termina la espera, el indicador vuelve a verde solo (DT-17).
  const sharedBusyUntil = settings?.shared_ai?.busy_until;
  useEffect(() => {
    if (!sharedBusyUntil) return;
    const id = window.setTimeout(() => useAppStore.getState().clearSharedAIBusy(), Math.max(0, sharedBusyUntil - Date.now()));
    return () => window.clearTimeout(id);
  }, [sharedBusyUntil]);

  // Carga inicial UNA sola vez. Antes dependía de `toast`, que cambia con cada aviso: cada aviso volvía a cargar
  // todo desde el navegador y podía deshacer un cambio que aún se estaba guardando.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const init = async () => {
      // 1.6.10 (DT-28): claves de API guardadas con la semilla anterior → CryptoKey no exportable.
      await migrateApiKeysToDeviceKey();
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

  // "Postular con CV adaptado": la oferta pasa al instante a Mis postulaciones (ya seleccionada)
  // y ahí se generan el CV y la carta adaptados, con el avance a la vista. Si la IA falla, la
  // oferta queda guardada igual y se puede reintentar.
  const handleApplyToJob = async (job: JobPosting) => {
    if (!profile) {
      toast.error('Primero sube tu CV en Mi perfil para adaptar la postulación.');
      navigate('/perfil');
      return;
    }
    const alreadyTracked = Boolean(job.status && job.status !== 'discovered');
    await addOrUpdateJob({
      ...job,
      status: alreadyTracked ? job.status : 'saved',
      tracked_at: job.tracked_at || new Date().toISOString()
    });
    navigate(`/postulaciones?oferta=${encodeURIComponent(job.id)}&adaptar=1`);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FBFBFD] dark:bg-ink-dark text-[#1D1D1F] dark:text-gray-100 transition-colors duration-300">
        {/* DT-30: primer elemento enfocable; solo se ve al llegar con el teclado. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-brand-700 focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
        >
          Saltar al contenido
        </a>
        {/* Apple Frosted Navbar with 5 semantic tabs + AI status indicator */}
        <Navbar llmSettings={settings} />

        {/* Main Routed Content Area */}
        <main id="contenido" tabIndex={-1} className="focus:outline-none max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 lg:pb-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
              <img
                src="/oportia-icon.svg"
                alt="Oportia Jobs IA"
                className="w-14 h-14 rounded-2xl shadow-xl shadow-[#20A88A]/20 animate-pulse object-contain"
              />
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border-2 border-[#20A88A] border-t-transparent animate-spin" />
                <p className="text-xs font-medium text-gray-500 dark:text-ink-200">
                  Iniciando Oportia Jobs IA...
                </p>
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              <div className="animate-fade-in">
                <Routes>
                  <Route
                    path="/conoce-oportia"
                    element={<LandingPage onStart={() => setIsOnboardingOpen(true)} onExplore={() => navigate('/empleos')} />}
                  />
                  <Route
                    path="/"
                    element={
                      // Primera visita: portada que presenta Oportia (antes se abría directo "Carga tu CV").
                      !hasCompletedOnboarding ? (
                        <LandingPage onStart={() => setIsOnboardingOpen(true)} onExplore={() => navigate('/empleos')} />
                      ) : (
                      <WelcomeHub
                        profile={profile}
                        llmSettings={settings}
                        onNavigateToTab={handleNavigate}
                        onOpenPrivacyModal={() => navigate('/ajustes')}
                        onOpenSettings={() => navigate('/ajustes')}
                        onUploadCVClick={() => navigate('/perfil')}
                        onOpenOnboarding={() => setIsOnboardingOpen(true)}
                      />
                      )
                    }
                  />

                  <Route
                    path="/empleos"
                    element={
                      <JobSearchPage
                        jobs={jobs}
                        profile={profile}
                        hasActiveKey={Boolean(settings.has_active_key)}
                        onOpenSettings={() => navigate('/ajustes')}
                        onApply={handleApplyToJob}
                        onNavigateToTracker={() => navigate('/postulaciones')}
                      />
                    }
                  />

                  <Route
                    path="/postulaciones"
                    element={
                      !hasCv && !jobs.some((j) => j.status && j.status !== 'discovered') && applications.length === 0 ? (
                        <CvRequiredGate
                          section="Mis postulaciones"
                          reason="Aquí adaptas tu CV y tu carta a cada oferta y sigues tus procesos. Sube tu CV para empezar, o recupera tus datos si ya usabas Oportia en otro equipo."
                        />
                      ) : (
                      <ApplicationsPage
                        jobs={jobs}
                        applications={applications}
                        profile={profile}
                        onApply={handleApplyToJob}
                      />
                      )
                    }
                  />

                  <Route
                    path="/aprender"
                    element={
                      !hasCv ? (
                        <CvRequiredGate
                          section="Aprender"
                          reason="Aprender compara tu experiencia con lo que piden las ofertas y te sugiere cursos para cerrar brechas. Necesita tu CV para saber desde dónde partes."
                        />
                      ) : (
                      <LearnPage
                        profile={profile}
                        jobs={jobs}
                        llmSettings={settings}
                        onOpenSettings={() => navigate('/ajustes')}
                        onNavigateToTab={handleNavigate}
                      />
                      )
                    }
                  />

                  <Route
                    path="/perfil"
                    element={
                      <ProfilePage
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

                  {/* 1.6.3 (DT-08): documentos legales dentro de la app */}
                  <Route path="/privacidad" element={<LegalPage kind="privacidad" />} />
                  <Route path="/terminos" element={<LegalPage kind="terminos" />} />

                  {/* 1.6.4 (DT-13): dirección desconocida → página 404 (la URL no cambia) */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </div>
            </ErrorBoundary>
          )}
        </main>

        {/* Global Apple-styled Footer with Instagram & Sponsor CTA */}
        <Footer onNavigateToTab={handleNavigate} />

        {/* Floating Opi Copilot Button (Ergonomic placement above bottom tab bar on mobile).
            Se oculta en la portada: ahí Opi ya está presente y el botón tapaba los llamados a la acción en celular. */}
        <div
          className={`no-print fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 ${
            isLandingVisible ? 'hidden' : ''
          }`}
        >
          <button
            type="button"
            onClick={() => setIsOpiChatOpen(!isOpiChatOpen)}
            aria-label={isOpiChatOpen ? 'Opi Copiloto: cerrar el chat' : 'Opi Copiloto: abrir el chat'}
            className="flex items-center justify-center gap-2.5 p-2 lg:px-4 lg:py-2.5 min-h-[48px] min-w-[48px] lg:min-h-[44px] rounded-full bg-gradient-to-tr from-ink via-ink-surface to-brand hover:opacity-95 text-white font-semibold text-xs shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition duration-200 border border-white/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
            title="Opi Copiloto: abrir el chat"
          >
            <OpiAvatar expression="saludando" size={26} decorative className="-my-1" />
            {/* DT-12: en celular y tablet solo el ícono (antes tapaba "Ver detalle" y "Danos tu opinión"). */}
            <span className="hidden lg:inline">Opi Copiloto</span>
          </button>
        </div>

        {/* Global Opi Copilot Slide-over Drawer (The ONLY conversational Opi access) */}
        {isOpiChatOpen && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs animate-fade-in no-print"
            role="dialog"
            aria-modal="true"
            aria-label="Asistente Opi"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpiChatOpen(false);
            }}
          >
            <div className="w-full max-w-xl h-full apple-glass bg-white/95 dark:bg-ink-surface/95 shadow-2xl flex flex-col border-l border-gray-200 dark:border-ink-border overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-ink-border flex items-center justify-between bg-gray-50/50 dark:bg-ink/50">
                <div className="flex items-center space-x-3">
                  <OpiAvatar expression={settings?.has_active_key ? 'saludando' : 'durmiendo'} size={44} />
                  <div>
                    <h3 className="font-bold text-sm text-ink dark:text-white">
                      Opi — Tu copiloto profesional
                    </h3>
                    <p className="text-xs text-ink-muted dark:text-gray-300">
                      La IA organiza y te orienta. Tú decides tu camino.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpiChatOpen(false)}
                  aria-label="Cerrar chat de Opi"
                  className="p-2 min-h-[44px] min-w-[44px] rounded-full text-ink-muted hover:text-ink dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
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

        {/* "¿Qué te parece Oportia?": opinión, contacto voluntario y donación */}
        <FeedbackDialog />
        <RestoreDataDialog
          onRestored={async () => {
            setIsOnboardingOpen(false);
            await setOnboardingCompleted(true);
            navigate('/');
          }}
        />
        {showFeedbackCard && !isLandingVisible && !isOnboardingOpen && !isFeedbackOpen && (
          <FeedbackCard onClose={() => setShowFeedbackCard(false)} />
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
