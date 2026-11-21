import React, { useCallback, useRef, useState } from 'react';
import { Dialog } from './Dialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Acción que borra o reemplaza datos: botón en rojo. */
  danger?: boolean;
}

/**
 * 1.6.12 (DT-35): confirmación con el diálogo propio de Oportia en vez de window.confirm() (que no se puede
 * leer bien en celular, no sigue el tema claro/oscuro y no tiene foco atrapado). Uso:
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (await confirm({...})) { ... }
 *   return <>{confirmDialog} ...</>;
 */
export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  const btn = 'min-h-[44px] px-4 rounded-xl text-sm font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none';
  const dialog = (
    <Dialog isOpen={Boolean(opts)} onClose={() => close(false)} title={opts?.title} maxWidth="md">
      <p className="text-sm text-ink-muted dark:text-ink-200">{opts?.message}</p>
      <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={() => close(false)} className={`${btn} text-ink-muted hover:text-ink dark:hover:text-white`}>
          {opts?.cancelLabel || 'Cancelar'}
        </button>
        <button
          type="button"
          onClick={() => close(true)}
          className={`${btn} text-white ${opts?.danger ? 'bg-rose-700 hover:bg-rose-800' : 'bg-brand-600 hover:bg-brand-700'}`}
        >
          {opts?.confirmLabel}
        </button>
      </div>
    </Dialog>
  );
  return [confirm, dialog];
}
