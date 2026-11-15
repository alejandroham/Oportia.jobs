import React from 'react';
import type { JobPosting } from '../../types';
import { JobCard } from './JobCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Info } from 'lucide-react';
import { OpiAvatar } from '../../components/ui/OpiAvatar';

interface JobResultsFeedProps {
  jobs: JobPosting[];
  userRegion?: string;
  onViewDetail: (job: JobPosting) => void;
  onToggleTrack: (job: JobPosting) => void;
  onDiscard: (jobId: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onScan: () => void;
  isScanning?: boolean;
}

export const JobResultsFeed: React.FC<JobResultsFeedProps> = ({
  jobs,
  userRegion,
  onViewDetail,
  onToggleTrack,
  onDiscard,
  page,
  totalPages,
  onPageChange,
  onScan,
  isScanning = false
}) => {
  const searchingBanner = isScanning ? (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-4 p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-700/50"
    >
      <OpiAvatar expression="pensando" size={jobs.length === 0 ? 96 : 56} decorative className="animate-pulse" />
      <div>
        <p className="text-sm font-bold text-ink dark:text-white">Opi está buscando ofertas para ti…</p>
        <p className="text-xs text-ink-muted dark:text-ink-200">Consultando los portales de empleo de Chile a la vez. Tarda unos segundos.</p>
      </div>
    </div>
  ) : null;

  if (isScanning && jobs.length === 0) {
    return searchingBanner;
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Info}
        opiExpression="curioso"
        title="Sin ofertas encontradas"
        description="Prueba con otros términos de búsqueda o haz clic en 'Buscar' para escanear portales chilenos."
        actionLabel="Buscar ofertas ahora"
        onAction={onScan}
      />
    );
  }

  return (
    <div className="space-y-6">
      {searchingBanner}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            userRegion={userRegion}
            onViewDetail={onViewDetail}
            onToggleTrack={onToggleTrack}
            onDiscard={onDiscard}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Página anterior de ofertas"
            className="px-4 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-ink-line text-xs font-semibold text-ink dark:text-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-ink-raised transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            Anterior
          </button>
          <span className="text-xs text-ink-muted font-medium">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Página siguiente de ofertas"
            className="px-4 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-ink-line text-xs font-semibold text-ink dark:text-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-ink-raised transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};
