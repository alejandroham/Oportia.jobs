import React, { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { Dialog } from '../ui/Dialog';

/**
 * 1.6.9 (DT-25): si hay cambios sin guardar, avisa antes de salir.
 * - Dentro de la app (otra sección u otra pestaña): modal propio con Guardar / Descartar / Seguir editando.
 * - Al cerrar o recargar la pestaña del navegador: el aviso estándar del navegador (no se puede personalizar).
 * Antes los cambios en Mi perfil se perdían sin aviso.
 */
export const UnsavedChangesGuard: React.FC<{
  isDirty: boolean;
  /** Guarda; devuelve false si no se pudo (por ejemplo, datos inválidos) para quedarse en la página. */
  onSave: () => boolean;
}> = ({ isDirty, onSave }) => {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search)
  );

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const open = blocker.state === 'blocked';
  const stay = () => blocker.reset?.();
  const btn =
    'min-h-[44px] px-4 rounded-xl text-sm font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none';

  return (
    <Dialog isOpen={open} onClose={stay} title="Tienes cambios sin guardar" maxWidth="md">
      <p className="text-sm text-ink-muted dark:text-ink-200">
        Si sales ahora, los cambios en tu perfil se pierden. ¿Qué quieres hacer?
      </p>
      <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={stay} className={`${btn} text-ink-muted hover:text-ink dark:hover:text-white`}>
          Seguir editando
        </button>
        <button
          type="button"
          onClick={() => blocker.proceed?.()}
          className={`${btn} border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40`}
        >
          Descartar cambios
        </button>
        <button
          type="button"
          onClick={() => (onSave() ? blocker.proceed?.() : blocker.reset?.())}
          className={`${btn} bg-brand-600 hover:bg-brand-700 text-white`}
        >
          Guardar y salir
        </button>
      </div>
    </Dialog>
  );
};
