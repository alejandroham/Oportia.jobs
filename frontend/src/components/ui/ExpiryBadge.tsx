import React from 'react';
import { CalendarClock } from 'lucide-react';
import type { JobPosting } from '../../types';
import { expiryLabel, getJobExpiry } from '../../utils/jobExpiry';

/** Vencimiento de la oferta: real (fecha de cierre) o estimado por Oportia. */
export const ExpiryBadge: React.FC<{ job: JobPosting; className?: string }> = ({ job, className = '' }) => {
  const e = getJobExpiry(job);
  if (!e) return null;
  const tone = e.expired
    ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-400/30'
    : e.daysLeft <= 3
      ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-400/30'
      : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-ink-raised dark:text-ink-200 dark:border-ink-line';
  const title = e.estimated
    ? 'Fecha estimada por Oportia: la oferta no publica fecha de cierre (30 días desde su publicación, o 45 desde que Oportia la encontró).'
    : 'Fecha de cierre publicada en la oferta.';
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold ${tone} ${className}`}>
      <CalendarClock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {expiryLabel(e)}
    </span>
  );
};
