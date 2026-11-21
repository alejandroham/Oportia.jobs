import React, { useEffect, useState } from 'react';
import { ArrowRight, X, Sparkles } from 'lucide-react';
import { OpiAvatar } from '../ui/OpiAvatar';
import { useAppStore, DEFAULT_EMPTY_PREFERENCES } from '../../state/useAppStore';
import { api } from '../../api';
import { withDetectedKeywords, initialSearchRoles, profileSearchTerms } from '../../utils/profileKeywords';
import { useToast } from '../Toast';
import { encryptApiKeyLocally } from '../../utils/crypto';
import type { CandidateProfile, LLMSettings, WorkExperience } from '../../types';
import { CHILE_REGIONS, canonicalRegion } from '../../utils/chileRegions';
import { OnboardingStep1CV } from './OnboardingStep1CV';
import { OnboardingStep2Preferences } from './OnboardingStep2Preferences';
import { OnboardingStep3AI } from './OnboardingStep3AI';
import { useCareerInsights } from '../../state/useCareerInsights';

export interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onFinished: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onFinished
}) => {
  const toast = useToast();
  const {
    profile,
    setProfile,
    preferences,
    setPreferences,
    settings,
    setSettings,
    setOnboardingCompleted,
    setJobs
  } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const careerInsights = useCareerInsights();
  const [isUploading, setIsUploading] = useState(false);
  /** 1.6.8 (DT-19): experiencias detectadas, editables antes de continuar. */
  const [tempExperiences, setTempExperiences] = useState<WorkExperience[]>(profile?.experiences || []);
  /** null = el CV se leyó con IA (o aún no se sube); texto = lectura básica sin IA. */
  const [basicReadingNote, setBasicReadingNote] = useState<string | null>(null);

  // Step 1: Editable summary state
  const [tempName, setTempName] = useState(profile?.name || '');
  const [tempTitle, setTempTitle] = useState(profile?.headline || profile?.primary_profession || '');
  const [tempSkills, setTempSkills] = useState<string[]>(profile?.technical_skills?.slice(0, 6) || []);

  // Step 2: Job search criteria
  const [targetRoles, setTargetRoles] = useState<string[]>(preferences?.target_roles || []);
  const [preferredRegion, setPreferredRegion] = useState(preferences?.preferred_region || 'Región Metropolitana de Santiago');
  const [isRemoteOnly, setIsRemoteOnly] = useState(preferences?.remote_only ?? false);

  // Step 3: AI setup
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'claude'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [isSavingAI, setIsSavingAI] = useState(false);

  // Cerrar con Escape, como cualquier diálogo accesible.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Step 1: file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.uploadCV(file);
      setBasicReadingNote(res.method === 'ia' ? null : res.note || '');
      res.profile = withDetectedKeywords(res.profile);
      await setProfile(res.profile);
      setTempName(res.profile.name || '');
      const detectedTitle = res.profile.headline || res.profile.primary_profession || '';
      setTempTitle(detectedTitle);
      setTempSkills(res.profile.technical_skills?.slice(0, 6) || []);
      setTempExperiences(res.profile.experiences || []);
      // DT-22: la región detectada en el CV se preselecciona (si la persona aún no eligió una).
      const detected = canonicalRegion(res.profile.region);
      const detectedName = CHILE_REGIONS.find((r) => r.id === detected)?.name;
      if (detectedName && !preferences?.preferred_region) setPreferredRegion(detectedName);
      // Cargos normalizados ("TENS", "Técnico en Enfermería"), no el titular literal del CV.
      const roles = initialSearchRoles(res.profile);
      if (roles.length && targetRoles.length === 0) {
        setTargetRoles(roles);
      }
      if (res.method === 'ia') {
        toast.success('La IA ordenó tu experiencia, tus títulos y tus cursos.', 'CV analizado');
        // Cargos afines → paso 3 ("Qué buscas") ya los trae; logros → Mis logros.
        const insights = await careerInsights.run(res.profile, { addDirect: 3 });
        const direct = (insights?.roles || []).filter((r) => r.category === 'directo').map((r) => r.title);
        if (direct.length) setTargetRoles((prev) => Array.from(new Set([...prev, ...direct.slice(0, 3)])));
      }
      if (res.method !== 'ia') toast.info(res.note || 'Analizamos tu CV sin IA (lectura básica).', 'CV analizado sin IA');
    } catch (err: any) {
      toast.error('Error al procesar CV: ' + (err?.message || err));
    } finally {
      setIsUploading(false);
    }
  };

  // Paso 1: la IA (primero, para que el CV se analice con IA).
  const handleSaveAI = async () => {
    if (apiKey.trim()) {
      setIsSavingAI(true);
      try {
        const encrypted = await encryptApiKeyLocally(apiKey.trim());
        localStorage.setItem(`job_search_llm_key_${provider}`, encrypted);
        localStorage.setItem('job_search_default_provider', provider);
        const updatedSettings: LLMSettings = {
          ...settings,
          provider,
          has_own_key: true,
          has_active_key: true,
          status_label: 'IA conectada',
          status_color: 'green'
        };
        await setSettings(updatedSettings);
      } finally {
        setIsSavingAI(false);
      }
    }
    setStep(2);
  };

  // Paso 2: el CV.
  const handleConfirmStep1 = async () => {
    if (profile) {
      const updatedProfile: CandidateProfile = {
        ...profile,
        name: tempName.trim() || profile.name,
        headline: tempTitle.trim() || profile.headline,
        experiences: tempExperiences.length
          ? tempExperiences.map((e) => ({ ...e, role: e.role.trim(), company: e.company.trim() }))
          : profile.experiences,
        technical_skills: Array.from(new Set([...tempSkills, ...(profile.technical_skills || [])]))
      };
      await setProfile(updatedProfile);
    }
    setStep(3);
  };

  // Paso 3: lo que busca (y terminar).
  const handleConfirmStep2 = async () => {
    const updatedPrefs = {
      ...(preferences || DEFAULT_EMPTY_PREFERENCES),
      target_roles: targetRoles.length > 0 ? targetRoles : (tempTitle ? [tempTitle] : ['Profesional']),
      preferred_region: preferredRegion,
      remote_only: isRemoteOnly
    };
    await setPreferences(updatedPrefs);
    await handleFinish();
  };

  // Terminar y lanzar la primera búsqueda.
  const handleFinish = async () => {
    setIsSavingAI(true);
    try {
      await setOnboardingCompleted(true);
      toast.success('¡Bienvenido a Oportia Jobs IA!', 'Buscando primeras oportunidades para ti...');

      // Initial search
      // Primera búsqueda: el primer cargo + los demás cargos y las palabras clave del perfil
      // (una oferta basta con que calce con alguno). Antes se buscaba solo el titular literal y
      // un CV de TENS podía no traer ninguna oferta.
      const currentProfile = useAppStore.getState().profile;
      const roles = targetRoles.length ? targetRoles : initialSearchRoles(currentProfile);
      const query = roles[0] || tempTitle || '';
      const extraTerms = Array.from(new Set([...roles.slice(1), ...profileSearchTerms(currentProfile)])).slice(0, 15);
      try {
        const searchRes = await api.searchJobs({
          keywords: query,
          region: isRemoteOnly ? undefined : preferredRegion,
          remote_only: isRemoteOnly,
          profile_keywords: extraTerms
        });
        const foundJobs = Array.isArray(searchRes) ? searchRes : (searchRes?.jobs || []);
        if (foundJobs.length > 0) {
          await setJobs(foundJobs);
        }
      } catch (searchErr) {
        console.warn('Initial search error:', searchErr);
      }

      onFinished();
    } catch (err: any) {
      toast.error('Error al finalizar configuración: ' + (err?.message || err));
    } finally {
      setIsSavingAI(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in no-print text-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guía de inicio paso a paso"
        className="w-full max-w-xl bg-white dark:bg-ink-surface border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        
        {/* Header & Step Indicator */}
        <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/60 dark:bg-ink-raised/40">
          <div className="flex items-center gap-3">
          <OpiAvatar expression={step === 1 ? 'pensando' : step === 2 ? 'curioso' : 'saludando'} size={52} decorative />
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider">
                Paso {step} de 3
              </span>
              <span className="text-gray-300 dark:text-ink-300">•</span>
              <span className="text-xs font-semibold text-ink dark:text-gray-300">
                {step === 1 ? 'Conecta la IA' : step === 2 ? 'Tu currículum' : 'Qué estás buscando'}
              </span>
            </div>
            <div className="flex space-x-1.5 mt-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? 'w-8 bg-brand-500'
                      : s < step
                      ? 'w-5 bg-emerald-500'
                      : 'w-5 bg-gray-200 dark:bg-ink-hover'
                  }`}
                />
              ))}
            </div>
          </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía de inicio"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-ink-muted hover:text-ink dark:hover:text-white hover:bg-gray-100 dark:hover:bg-ink-raised transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
            title="Cerrar guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {step === 1 && (
            <OnboardingStep3AI
              apiKey={apiKey}
              setApiKey={setApiKey}
              provider={provider}
              setProvider={setProvider}
            />
          )}

          {step === 2 && (
            <>
              {!settings.has_active_key && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 text-amber-900 dark:text-amber-100">
                  <span className="font-semibold">La IA no está activa.</span> Tu CV se leerá de forma básica y puede clasificar mal tu
                  experiencia, tus títulos y tus cursos.{' '}
                  <button type="button" onClick={() => setStep(1)} className="underline font-semibold cursor-pointer">
                    Volver a activar la IA
                  </button>
                </div>
              )}
              <OnboardingStep1CV
                isUploading={isUploading}
                onFileUpload={handleFileUpload}
                tempName={tempName}
                setTempName={setTempName}
                tempTitle={tempTitle}
                setTempTitle={setTempTitle}
                tempSkills={tempSkills}
                setTempSkills={setTempSkills}
                basicReadingNote={basicReadingNote}
                experiences={tempExperiences}
                setExperiences={setTempExperiences}
              />
            </>
          )}

          {step === 3 && (
            <OnboardingStep2Preferences
              targetRoles={targetRoles}
              setTargetRoles={setTargetRoles}
              preferredRegion={preferredRegion}
              setPreferredRegion={setPreferredRegion}
              isRemoteOnly={isRemoteOnly}
              setIsRemoteOnly={setIsRemoteOnly}
            />
          )}
        </div>

        {/* Footer Navigation Actions */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/40 dark:bg-ink-raised/40">
          {step === 1 && (
            <>
              <button type="button" onClick={() => setStep(2)} className="min-h-[44px] px-3 text-xs text-ink-muted hover:text-ink dark:hover:text-white font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none rounded-xl">
                Lo haré después
              </button>
              <button type="button" onClick={handleSaveAI} disabled={isSavingAI} className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none">
                <span>{apiKey.trim() ? 'Guardar clave y continuar' : 'Continuar'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button type="button" onClick={() => setStep(3)} className="min-h-[44px] px-3 text-xs text-ink-muted hover:text-ink dark:hover:text-white font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none rounded-xl">
                Omitir por ahora
              </button>
              <button type="button" onClick={handleConfirmStep1} className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none">
                <span>{tempName ? 'Se ve bien, continuar' : 'Continuar'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button type="button" onClick={handleFinish} disabled={isSavingAI} className="min-h-[44px] px-3 text-xs text-ink-muted hover:text-ink dark:hover:text-white font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none rounded-xl">
                Omitir por ahora
              </button>
              <button type="button" onClick={handleConfirmStep2} disabled={isSavingAI} className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Guardar y buscar ofertas</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
