import React from 'react';
import {
  FileText,
  Target,
  Cpu,
  Briefcase,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Compass,
  TrendingUp,
  Layers,
  ShieldCheck,
  Download,
  Trash2,
  Smartphone
} from 'lucide-react';
import type { CandidateProfile, LLMSettings } from '../types';
import { useAppStore } from '../state/useAppStore';

import { computeNextStep } from '../utils/nextStep';
import { OpiAvatar } from './ui/OpiAvatar';
import { getAIStatus } from '../utils/aiStatus';
import { InstallAppButton } from './InstallApp';
import { isStandalone } from '../utils/pwa';

const ICON_MAP = {
  TrendingUp,
  FileText,
  Target,
  Compass,
  Briefcase
};

interface WelcomeHubProps {
  profile?: CandidateProfile | null;
  llmSettings?: LLMSettings;
  onNavigateToTab?: (tab: string) => void;
  onOpenPrivacyModal?: () => void;
  onOpenSettings?: () => void;
  onUploadCVClick?: () => void;
  onOpenOnboarding?: () => void;
}

export const WelcomeHub: React.FC<WelcomeHubProps> = ({
  profile,
  llmSettings,
  onNavigateToTab,
  onOpenOnboarding
}) => {
  const { preferences, jobs, applications } = useAppStore();

  const handleNavigate = (path: string) => {
    if (onNavigateToTab) {
      onNavigateToTab(path);
    }
  };

  // State checks for next action & checklist
  // DT-34: saludo con el primer nombre y mayúscula inicial ("Hola, Paula" y no "Hola, paula ficticia rojas").
  const firstName = (profile?.name || '').trim().split(/\s+/)[0] || '';
  const candidateName =
    firstName && firstName.toLowerCase() !== 'candidato'
      ? firstName.charAt(0).toLocaleUpperCase('es-CL') + firstName.slice(1).toLocaleLowerCase('es-CL')
      : null;
  const hasCV = Boolean(
    profile?.name &&
    profile.name.trim().toLowerCase() !== 'candidato' &&
    ((profile.technical_skills?.length || 0) > 0 || (profile.experiences?.length || 0) > 0)
  );
  const hasPrefs = Boolean(preferences?.target_roles && preferences.target_roles.length > 0);
  const hasJobs = jobs.length > 0;
  const aiStatus = getAIStatus(llmSettings);
  const hasAI = aiStatus.ready || aiStatus.kind === 'shared_active';
  const hasApplications = applications.length > 0;
  const interviewJob = jobs.find(j => j.status === 'interview_scheduled' || j.status === 'interview_done');

  const nextAction = computeNextStep({ profile, preferences, jobs, applications, llmSettings });
  const ActionIcon = ICON_MAP[nextAction.iconName] || Compass;

  // Progress Checklist calculation
  const checklist = [
    { label: 'CV cargado y analizado', done: hasCV, route: '/perfil?tab=cv' },
    { label: 'Criterios de búsqueda definidos', done: hasPrefs, route: '/perfil?tab=busqueda' },
    { label: 'IA activada (opcional)', done: hasAI, route: '/ajustes' },
    { label: 'Primera postulación adaptada', done: hasApplications, route: '/postulaciones' }
  ];
  const completedCount = checklist.filter(c => c.done).length;
  const progressPct = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in text-xs">
      
      {/* Saludo personalizado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-4">
        <div>
          {/* DT-26: un nombre muy largo se corta en 2 líneas en vez de desbordar el saludo. */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight min-w-0 break-words [overflow-wrap:anywhere] line-clamp-2">
            {candidateName ? `Hola, ${candidateName}` : 'Bienvenido a Oportia Jobs IA'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-ink-200 mt-0.5">
            Tu talento. Tus decisiones. Tus oportunidades.
          </p>
        </div>

        {onOpenOnboarding && (
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-200 border border-brand-200/50 dark:border-brand-700/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition cursor-pointer self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-700 dark:text-brand-300" />
            <span>Repetir guía de inicio</span>
          </button>
        )}
      </div>

      {/* Tarjeta Hero: "Tu siguiente paso" */}
      <div className="apple-glass apple-card p-6 rounded-3xl border-brand-500/20 bg-gradient-to-br from-brand-50/60 via-white to-teal-50/40 dark:from-brand-950/60 dark:via-ink-surface/80 dark:to-ink-surface dark:border-brand-500/30 shadow-lg space-y-4">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-500/20 text-brand-800 dark:text-brand-200 dark:ring-1 dark:ring-brand-400/40">
            Tu siguiente paso
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <OpiAvatar expression={progressPct === 100 ? 'celebrando' : 'saludando'} size={96} decorative className="-my-2" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-ink dark:text-white">
                {nextAction.title}
              </h2>
              <p className="text-xs text-ink-muted dark:text-gray-300 max-w-xl leading-relaxed">
                {nextAction.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate(nextAction.route)}
            className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            <span>{nextAction.cta}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Checklist de Progreso & Resumen en dos columnas */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        
        {/* Checklist de Progreso (7 cols) */}
        <div className="md:col-span-7 apple-glass apple-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-ink dark:text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Progreso de preparación ({progressPct}%)</span>
            </h3>
            <span className="text-xs font-semibold text-ink-muted">
              {completedCount} de {checklist.length} listos
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200/80 dark:bg-ink-raised rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Checklist items */}
          <div className="space-y-2 pt-1">
            {checklist.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleNavigate(item.route)}
                className="w-full flex items-center justify-between p-2.5 min-h-[44px] rounded-xl bg-gray-50/80 dark:bg-ink-raised/50 hover:bg-gray-100 dark:hover:bg-ink-raised border border-black/5 dark:border-white/5 transition text-left cursor-pointer group focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              >
                <div className="flex items-center space-x-2.5">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 dark:text-ink-300 shrink-0" />
                  )}
                  <span className={`text-xs ${item.done ? 'text-gray-800 dark:text-gray-200 font-medium line-through opacity-75' : 'text-ink dark:text-white font-medium'}`}>
                    {item.label}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition" />
              </button>
            ))}
          </div>
        </div>

        {/* Resumen de actividad rápida (5 cols) */}
        <div className="md:col-span-5 space-y-3">
          <button
            type="button"
            onClick={() => handleNavigate('/empleos')}
            className="w-full apple-glass apple-card p-4 min-h-[44px] rounded-2xl flex items-center justify-between hover:border-brand-500/40 transition cursor-pointer group text-left focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-brand-700 dark:text-brand-400 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-ink-muted block">Ofertas en Radar</span>
                <span className="text-base font-bold text-ink dark:text-white">{jobs.length} disponibles</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('/postulaciones')}
            className="w-full apple-glass apple-card p-4 min-h-[44px] rounded-2xl flex items-center justify-between hover:border-brand-500/40 transition cursor-pointer group text-left focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-brand-700 dark:text-brand-400 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-ink-muted block">Postulaciones</span>
                <span className="text-base font-bold text-ink dark:text-white">{applications.length} en seguimiento</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('/ajustes')}
            className="w-full apple-glass apple-card p-4 min-h-[44px] rounded-2xl flex items-center justify-between hover:border-brand-500/40 transition cursor-pointer group text-left focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-ink-muted block">Inteligencia artificial</span>
                <span className="text-sm font-bold text-ink dark:text-white block">{aiStatus.title}</span>
                <span className={`text-xs block ${aiStatus.kind === 'shared_available' ? 'text-brand-700 dark:text-brand-300 font-semibold' : 'text-ink-muted dark:text-ink-200'}`}>
                  {aiStatus.detail}
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Tus datos: se guardan en el equipo de la persona */}
          <section
            aria-labelledby="tus-datos-title"
            className="apple-glass apple-card p-4 rounded-2xl space-y-3"
          >
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 id="tus-datos-title" className="text-sm font-bold text-ink dark:text-white">
                  Tus datos se quedan en tu equipo
                </h3>
                <p className="text-xs text-ink-muted dark:text-ink-200 leading-relaxed">
                  Tu CV, perfil y postulaciones se guardan en este navegador, no en nuestros servidores. Descarga un
                  respaldo o bórralos cuando lo necesites.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleNavigate('/ajustes?tab=privacidad')}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-ink-line text-xs font-semibold text-ink dark:text-white hover:bg-gray-50 dark:hover:bg-ink-hover transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Descargar respaldo
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('/ajustes?tab=privacidad')}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-ink-line text-xs font-semibold text-ink dark:text-white hover:bg-gray-50 dark:hover:bg-ink-hover transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Borrar mis datos
              </button>
            </div>
          </section>

          {!isStandalone() && (
            <section aria-labelledby="instalar-title" className="apple-glass apple-card p-4 rounded-2xl space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h3 id="instalar-title" className="text-sm font-bold text-ink dark:text-white">Lleva Oportia en tu celular</h3>
                  <p className="text-xs text-ink-muted dark:text-ink-200 leading-relaxed">
                    Déjala como app en tu pantalla de inicio (iPhone o Android) y ábrela en un toque.
                  </p>
                </div>
              </div>
              <InstallAppButton variant="outline" label="Ver cómo instalarla" className="w-full" />
            </section>
          )}
        </div>

      </div>

    </div>
  );
};
