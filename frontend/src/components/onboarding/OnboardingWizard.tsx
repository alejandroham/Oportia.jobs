import React, { useState } from 'react';
import { ArrowRight, X, Sparkles } from 'lucide-react';
import { useAppStore, DEFAULT_EMPTY_PREFERENCES } from '../../state/useAppStore';
import { api } from '../../api';
import { useToast } from '../Toast';
import { encryptApiKeyLocally } from '../../utils/crypto';
import type { CandidateProfile, LLMSettings } from '../../types';
import { OnboardingStep1CV } from './OnboardingStep1CV';
import { OnboardingStep2Preferences } from './OnboardingStep2Preferences';
import { OnboardingStep3AI } from './OnboardingStep3AI';

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
  const [isUploading, setIsUploading] = useState(false);

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

  if (!isOpen) return null;

  // Step 1: file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.uploadCV(file);
      await setProfile(res.profile);
      setTempName(res.profile.name || '');
      const detectedTitle = res.profile.headline || res.profile.primary_profession || '';
      setTempTitle(detectedTitle);
      setTempSkills(res.profile.technical_skills?.slice(0, 6) || []);
      if (detectedTitle && targetRoles.length === 0) {
        setTargetRoles([detectedTitle]);
      }
      toast.success('CV procesado correctamente');
    } catch (err: any) {
      toast.error('Error al procesar CV: ' + (err?.message || err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmStep1 = async () => {
    if (profile) {
      const updatedProfile: CandidateProfile = {
        ...profile,
        name: tempName.trim() || profile.name,
        headline: tempTitle.trim() || profile.headline,
        technical_skills: Array.from(new Set([...tempSkills, ...(profile.technical_skills || [])]))
      };
      await setProfile(updatedProfile);
    }
    setStep(2);
  };

  // Step 2: preferences
  const handleConfirmStep2 = async () => {
    const updatedPrefs = {
      ...(preferences || DEFAULT_EMPTY_PREFERENCES),
      target_roles: targetRoles.length > 0 ? targetRoles : (tempTitle ? [tempTitle] : ['Profesional']),
      preferred_region: preferredRegion,
      remote_only: isRemoteOnly
    };
    await setPreferences(updatedPrefs);
    setStep(3);
  };

  // Step 3: finish & launch initial search
  const handleFinish = async (connectAI: boolean) => {
    setIsSavingAI(true);
    try {
      if (connectAI && apiKey.trim()) {
        const encrypted = await encryptApiKeyLocally(apiKey.trim());
        localStorage.setItem(`job_search_llm_key_${provider}`, encrypted);
        localStorage.setItem('job_search_default_provider', provider);

        const updatedSettings: LLMSettings = {
          ...settings,
          provider,
          has_active_key: true,
          status_label: 'IA conectada',
          status_color: 'green'
        };
        await setSettings(updatedSettings);
      }

      await setOnboardingCompleted(true);
      toast.success('¡Bienvenido a Oportia Jobs IA!', 'Buscando primeras oportunidades para ti...');

      // Initial search
      const query = targetRoles[0] || tempTitle || '';
      try {
        const found = await api.searchJobs({
          keywords: query,
          region: isRemoteOnly ? undefined : preferredRegion,
          remote_only: isRemoteOnly
        });
        if (found && found.length > 0) {
          await setJobs(found);
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
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header & Step Indicator */}
        <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/60 dark:bg-zinc-800/40">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Paso {step} de 3
              </span>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {step === 1 ? 'Tu currículum' : step === 2 ? 'Qué estás buscando' : 'Conecta la IA'}
              </span>
            </div>
            <div className="flex space-x-1.5 mt-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? 'w-8 bg-blue-600'
                      : s < step
                      ? 'w-5 bg-emerald-500'
                      : 'w-5 bg-gray-200 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Cerrar guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {step === 1 && (
            <OnboardingStep1CV
              isUploading={isUploading}
              onFileUpload={handleFileUpload}
              tempName={tempName}
              setTempName={setTempName}
              tempTitle={tempTitle}
              setTempTitle={setTempTitle}
              tempSkills={tempSkills}
              setTempSkills={setTempSkills}
            />
          )}

          {step === 2 && (
            <OnboardingStep2Preferences
              targetRoles={targetRoles}
              setTargetRoles={setTargetRoles}
              preferredRegion={preferredRegion}
              setPreferredRegion={setPreferredRegion}
              isRemoteOnly={isRemoteOnly}
              setIsRemoteOnly={setIsRemoteOnly}
            />
          )}

          {step === 3 && (
            <OnboardingStep3AI
              apiKey={apiKey}
              setApiKey={setApiKey}
              provider={provider}
              setProvider={setProvider}
            />
          )}
        </div>

        {/* Footer Navigation Actions */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/40 dark:bg-zinc-800/40">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium cursor-pointer"
              >
                Omitir por ahora
              </button>
              <button
                type="button"
                onClick={handleConfirmStep1}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <span>{tempName ? 'Se ve bien, continuar' : 'Continuar'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium cursor-pointer"
              >
                Omitir por ahora
              </button>
              <button
                type="button"
                onClick={handleConfirmStep2}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <span>Guardar y continuar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => handleFinish(false)}
                disabled={isSavingAI}
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-semibold cursor-pointer"
              >
                Lo haré después
              </button>
              <button
                type="button"
                onClick={() => handleFinish(true)}
                disabled={isSavingAI}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{apiKey.trim() ? 'Conectar y buscar ofertas' : 'Finalizar y buscar ofertas'}</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
