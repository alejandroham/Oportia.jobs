import React from 'react';

interface FailedSourcesBannerProps {
  sourcesFailed: string[];
  isScanning: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

export const FailedSourcesBanner: React.FC<FailedSourcesBannerProps> = ({
  sourcesFailed,
  isScanning,
  onRetry,
  onDismiss
}) => {
  if (sourcesFailed.length === 0) return null;

  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs shadow-xs"
    >
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">⚠️</span>
        <div>
          <span className="font-semibold">
            {sourcesFailed.length} {sourcesFailed.length === 1 ? 'fuente no respondió' : 'fuentes no respondieron'}:{' '}
          </span>
          <span className="opacity-90">{sourcesFailed.join(', ')}.</span>
          <span className="block sm:inline sm:ml-1 text-amber-700 dark:text-amber-300">
            Se muestran los resultados de las fuentes activas.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          type="button"
          onClick={onRetry}
          disabled={isScanning}
          className="px-2.5 py-1 font-semibold rounded-lg bg-amber-200/70 hover:bg-amber-300 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-2 py-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition cursor-pointer"
          aria-label="Descartar aviso de fuentes no disponibles"
        >
          Descartar
        </button>
      </div>
    </div>
  );
};
