import React from 'react';
import { RefreshCw } from 'lucide-react';

interface StaleFitBannerProps {
  count: number;
  isUpdating: boolean;
  aiReady: boolean;
  onUpdate: () => void;
  onOpenSettings?: () => void;
}

/** Aviso: tu perfil cambió y hay porcentajes de compatibilidad calculados con el perfil anterior. */
export const StaleFitBanner: React.FC<StaleFitBannerProps> = ({ count, isUpdating, aiReady, onUpdate, onOpenSettings }) => {
  if (count <= 0) return null;
  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-100"
    >
      <p>
        <span className="font-semibold">Tu perfil cambió.</span> Actualizaste tu experiencia, tus habilidades, lo que buscas o lo que Opi sabe de ti, así que{' '}
        {count === 1 ? '1 porcentaje de compatibilidad quedó desactualizado' : `${count} porcentajes de compatibilidad quedaron desactualizados`}.
      </p>
      {aiReady ? (
        <button
          type="button"
          onClick={onUpdate}
          disabled={isUpdating}
          className="inline-flex items-center gap-1.5 shrink-0 min-h-[40px] px-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-semibold cursor-pointer disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:outline-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isUpdating ? 'Actualizando…' : 'Actualizar porcentajes'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1.5 shrink-0 min-h-[40px] px-3 rounded-xl border border-amber-400 font-semibold cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
          Activar IA para actualizarlos
        </button>
      )}
    </div>
  );
};
