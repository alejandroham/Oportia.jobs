import React from 'react';
import type { JobPosting } from '../../types';
import { FitScoreBadge } from '../shared/FitScoreBadge';
import { Bookmark, BookmarkCheck, ExternalLink, X, MapPin, Building2, DollarSign } from 'lucide-react';

interface JobCardProps {
  job: JobPosting;
  userRegion?: string;
  onViewDetail: (job: JobPosting) => void;
  onToggleTrack: (job: JobPosting) => void;
  onDiscard: (jobId: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  userRegion,
  onViewDetail,
  onToggleTrack,
  onDiscard
}) => {
  const isTracked = job.status && job.status !== 'discovered';
  const isRegional = job.is_user_region || (userRegion && job.location?.toLowerCase().includes(userRegion.toLowerCase()));

  // Formato de fecha relativo simple
  const formatRelativeDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} d`;
      return `Hace ${Math.floor(diffDays / 7)} sem`;
    } catch {
      return '';
    }
  };

  const relativeDate = formatRelativeDate(job.posted_at || job.discovered_at);

  return (
    <div
      onClick={() => onViewDetail(job)}
      className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-xs hover:shadow-md hover:border-[#20A88A]/50 transition-all cursor-pointer text-left"
    >
      {/* Botón de descarte sutil en esquina superior derecha */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDiscard(job.id);
        }}
        title="Descartar del radar"
        className="absolute top-3.5 right-3.5 p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Contenido principal */}
      <div className="space-y-3">
        {/* Fila superior: Empresa, insignia regional y Badge de compatibilidad */}
        <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
              {job.company || 'Empresa confidencial'}
            </span>
            {isRegional && (
              <span className="shrink-0 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 rounded-full border border-teal-200/60 dark:border-teal-800/40">
                Tu región
              </span>
            )}
          </div>

          <FitScoreBadge score={job.fit_score} size="sm" />
        </div>

        {/* Título de la vacante */}
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#20A88A] transition-colors leading-snug line-clamp-2">
          {job.title}
        </h3>

        {/* Metadatos: Ubicación, Modalidad, Salario, Fecha */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>{job.location || 'Chile'}</span>
          </span>

          <span>•</span>

          <span className="font-medium text-gray-700 dark:text-gray-300">
            {job.modality || (job.is_remote ? 'Remoto' : 'Presencial')}
          </span>

          {job.salary_range ? (
            <>
              <span>•</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                <DollarSign className="w-3 h-3" />
                {job.salary_range}
              </span>
            </>
          ) : (
            <>
              <span>•</span>
              <span className="text-gray-400 italic">Renta no publicada</span>
            </>
          )}

          {relativeDate && (
            <>
              <span>•</span>
              <span className="text-gray-400">{relativeDate}</span>
            </>
          )}
        </div>

        {/* Breve extracto de descripción */}
        {job.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        )}
      </div>

      {/* Fila de acciones directas (2 acciones claras) */}
      <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-gray-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTrack(job);
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition min-h-[38px] ${
            isTracked
              ? 'bg-teal-50 dark:bg-teal-950/40 text-[#20A88A] border-teal-200 dark:border-teal-800/60'
              : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700 hover:bg-gray-50'
          }`}
        >
          {isTracked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          <span>{isTracked ? 'En seguimiento' : 'Guardar'}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(job);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white text-xs font-semibold shadow-xs transition min-h-[38px]"
        >
          <span>Ver detalle</span>
        </button>
      </div>
    </div>
  );
};
