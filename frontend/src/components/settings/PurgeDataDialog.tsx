import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';

interface PurgeDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Descarga un respaldo antes de borrar. */
  onDownloadBackup: () => Promise<void>;
  onConfirm: () => Promise<void>;
}

/**
 * Derecho al olvido: confirmación con dos casillas.
 * 1) Entiendo qué se borra y que no se puede deshacer.
 * 2) Confirmo que no quiero un respaldo (o lo descargo aquí mismo).
 */
export const PurgeDataDialog: React.FC<PurgeDataDialogProps> = ({ isOpen, onClose, onDownloadBackup, onConfirm }) => {
  const [understood, setUnderstood] = useState(false);
  const [noBackup, setNoBackup] = useState(false);
  const [backupDone, setBackupDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUnderstood(false);
      setNoBackup(false);
      setBackupDone(false);
      setBusy(false);
    }
  }, [isOpen]);

  const canDelete = understood && (noBackup || backupDone) && !busy;

  return (
    <Dialog isOpen={isOpen} onClose={busy ? () => {} : onClose} title="Borrar todos mis datos" maxWidth="md">
      <div className="space-y-4 text-sm">
        <div className="flex gap-3 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/30 text-rose-900 dark:text-rose-100">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold">Se borrará de este navegador, de forma permanente:</p>
            <p>tu CV y perfil, lo que buscas, tus postulaciones y documentos, tus logros, la conversación con Opi, tus claves de IA y la activación de la IA gratuita.</p>
            <p>Después volverás a la página principal y la guía de inicio partirá de cero, incluido el paso "Conecta la IA (opcional)".</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl border border-gray-200 dark:border-ink-border">
          <p className="text-xs text-ink-muted dark:text-ink-200">
            {backupDone ? 'Respaldo descargado. Guárdalo en un lugar seguro.' : '¿Quieres conservar una copia? Descarga un respaldo antes de borrar.'}
          </p>
          <button
            type="button"
            onClick={async () => {
              await onDownloadBackup();
              setBackupDone(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 shrink-0 min-h-[40px] px-3 rounded-xl border border-gray-300 dark:border-ink-line text-xs font-semibold text-ink dark:text-white hover:bg-gray-50 dark:hover:bg-ink-hover cursor-pointer"
          >
            {backupDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> : <Download className="w-3.5 h-3.5" aria-hidden="true" />}
            {backupDone ? 'Respaldo descargado' : 'Descargar respaldo'}
          </button>
        </div>

        <label className="flex items-start gap-2 text-xs cursor-pointer">
          <input type="checkbox" className="mt-0.5 w-4 h-4 accent-rose-600" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
          <span>Entiendo que se borrarán todos mis datos de este navegador y que <strong>no se puede deshacer</strong>.</span>
        </label>
        {!backupDone && (
          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-rose-600" checked={noBackup} onChange={(e) => setNoBackup(e.target.checked)} />
            <span>Confirmo que <strong>no quiero descargar un respaldo</strong> antes de borrar.</span>
          </label>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-ink-muted hover:text-ink dark:hover:text-white cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
            }}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" /> {busy ? 'Borrando…' : 'Borrar todo'}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
