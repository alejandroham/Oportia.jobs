import React from 'react';
import { CalendarClock, Hand } from 'lucide-react';

interface CvOrderBarProps {
  manual: boolean;
  outOfOrder: boolean;
  onSortByDate: () => void;
}

/**
 * Cómo se ordena esta sección del CV: por fecha (automático, lo más reciente primero) o a mano con las flechas.
 */
export const CvOrderBar: React.FC<CvOrderBarProps> = ({ manual, outOfOrder, onSortByDate }) => (
  <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-ink-raised/60 border border-gray-200/70 dark:border-ink-line/60 text-xs">
    {manual ? (
      <span className="inline-flex items-center gap-1.5 text-ink dark:text-gray-200">
        <Hand className="w-3.5 h-3.5" aria-hidden="true" /> Orden manual: queda como lo dejaste con las flechas.
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-ink dark:text-gray-200">
        <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
        {outOfOrder ? 'Hay fechas fuera de orden: al guardar se ordenan de la más reciente a la más antigua.' : 'Ordenado por fecha, de lo más reciente a lo más antiguo.'}
      </span>
    )}
    {(manual || outOfOrder) && (
      <button
        type="button"
        onClick={onSortByDate}
        className="ml-auto inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-white dark:bg-ink-surface border border-gray-200 dark:border-ink-line font-semibold text-ink dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-ink-hover cursor-pointer"
      >
        <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" /> Ordenar por fecha
      </button>
    )}
    {!manual && <span className="basis-full text-ink-muted dark:text-ink-200">¿Prefieres otro orden? Usa las flechas ↑ ↓.</span>}
  </div>
);
