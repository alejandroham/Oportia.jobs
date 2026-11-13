import React, { useEffect } from 'react';
import type { JobPosting, FitEvaluation } from '../../types';
import { FitEvaluationSummary } from '../shared/FitEvaluationSummary';
import { AINotConnectedBanner } from '../shared/AINotConnectedBanner';
import { X, ExternalLink, Bookmark, BookmarkCheck, Sparkles, Building2, MapPin, DollarSign, Send } from 'lucide-react';

interface JobDetailModalProps {
  job: JobPosting | null;
  evaluation?: FitEvaluation | null;
  isLoadingEvaluation?: boolean;
  hasActiveKey?: boolean;
  onOpenSettings?: () => void;
  onEvaluate: (job: JobPosting) => void;
  onOpenFullEvaluation: () => void;
  onApply: (job: JobPosting) => void;
  onToggleTrack: (job: JobPosting) => void;
  onClose: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  evaluation,
  isLoadingEvaluation = false,
  hasActiveKey = true,
  onOpenSettings,
  onEvaluate,
  onOpenFullEvaluation,
  onApply,
  onToggleTrack,
  onClose
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!job) return null;

  const isTracked = job.status && job.status !== 'discovered';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-xl bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 shadow-2xl flex flex-col justify-between animate-slide-left">
          {/* Header con botón cerrar */}
          <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex items-start justify-between gap-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span>{job.company}</span>
                <span>•</span>
                <span className="text-[#20A88A] font-semibold">
                  {job.modality || (job.is_remote ? 'Remoto' : 'Presencial')}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {job.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              aria-label="Cerrar detalle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo escroleable */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Metadatos rápidos */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/60 text-xs text-gray-600 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{job.location || 'Chile'}</span>
              </span>

              {job.salary_range && (
                <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{job.salary_range}</span>
                </span>
              )}

              {job.source && (
                <span className="text-gray-400">
                  Fuente: <strong className="font-semibold text-gray-600 dark:text-gray-300 capitalize">{job.source}</strong>
                </span>
              )}
            </div>

            {/* Módulo de compatibilidad con IA */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#20A88A]" />
                Compatibilidad con tu perfil
              </h4>

              {evaluation ? (
                <FitEvaluationSummary
                  evaluation={evaluation}
                  onOpenFullModal={onOpenFullEvaluation}
                />
              ) : !hasActiveKey ? (
                <AINotConnectedBanner
                  title="Conecta la IA para evaluar compatibilidad"
                  description="Compara tus habilidades y experiencia contra esta vacante mediante 5 perspectivas de selección."
                  actionText="Conectar IA"
                  onConnect={onOpenSettings}
                />
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-gray-300 dark:border-zinc-700 text-center space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Aún no evalúas esta vacante con respecto a tu CV.
                  </p>
                  <button
                    type="button"
                    onClick={() => onEvaluate(job)}
                    disabled={isLoadingEvaluation}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 hover:bg-brand-100 text-xs font-semibold border border-brand-200/80 transition cursor-pointer active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                    <span>{isLoadingEvaluation ? 'Evaluando con IA...' : 'Evaluar compatibilidad con IA'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Requisitos y tecnologías destacadas */}
            {job.tags && job.tags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tecnologías y Palabras Clave
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-zinc-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Descripción completa */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Descripción de la Oferta
              </h4>
              <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-gray-50/50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800">
                {job.description || 'Sin descripción detallada provista por el portal.'}
              </div>
            </div>
          </div>

          {/* Barra de acciones fija en la parte inferior */}
          <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleTrack(job)}
                aria-label={isTracked ? `Dejar de seguir ${job.title}` : `Guardar y seguir ${job.title}`}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold border transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
                  isTracked
                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800/60'
                    : 'bg-white dark:bg-zinc-800 text-ink dark:text-gray-300 border-gray-200 dark:border-zinc-700 hover:bg-gray-50'
                }`}
              >
                {isTracked ? <BookmarkCheck className="w-4 h-4 text-brand" /> : <Bookmark className="w-4 h-4" />}
                <span>{isTracked ? 'En seguimiento' : 'Guardar'}</span>
              </button>

              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-zinc-700 text-ink dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Oferta original</span>
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onApply(job);
                onClose();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-brand hover:bg-brand-600 text-white text-xs sm:text-sm font-semibold shadow-md transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
            >
              <Send className="w-4 h-4" />
              <span>Postular con CV adaptado</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
