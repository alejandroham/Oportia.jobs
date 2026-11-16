import React from 'react';
import { Zap, Radio } from 'lucide-react';

interface IndexResultsBannerProps {
  generatedAt: string | null;
  indexCount: number;
  onSearchLive: () => void;
}

const formatDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
};

/** Aviso cuando la búsqueda respondió al instante con el índice diario, con la opción de buscar también en vivo. */
export const IndexResultsBanner: React.FC<IndexResultsBannerProps> = ({ generatedAt, indexCount, onSearchLive }) => {
  const when = formatDate(generatedAt);
  return (
    <div
      role="status"
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-brand-200 dark:border-brand-400/30 bg-brand-50 dark:bg-brand-950/40 text-xs text-ink dark:text-gray-100"
    >
      <div className="flex items-start gap-2">
        <Zap className="w-4 h-4 mt-0.5 text-brand-700 dark:text-brand-300 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">Resultados del índice de hoy</span>
          {indexCount > 0 && <> ({indexCount.toLocaleString('es-CL')} ofertas de Chile</>}
          {indexCount > 0 && when && <>, actualizado el {when}</>}
          {indexCount > 0 && ')'}. Busca también en los portales en vivo para ver lo publicado después.
        </p>
      </div>
      <button
        type="button"
        onClick={onSearchLive}
        className="inline-flex items-center gap-1.5 shrink-0 min-h-[40px] px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
      >
        <Radio className="w-3.5 h-3.5" aria-hidden="true" /> Buscar también en vivo
      </button>
    </div>
  );
};
