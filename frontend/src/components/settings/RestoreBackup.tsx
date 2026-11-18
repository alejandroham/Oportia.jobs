import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { useToast } from '../Toast';
import { parseSessionBackupFile } from '../../utils/storage';

interface RestoreBackupProps {
  /** Se llama después de restaurar (por ejemplo, para ir a Inicio). */
  onRestored?: () => void;
  buttonLabel?: string;
}

/**
 * Restaurar un respaldo (.oportia cifrado, .nexusjob o .json): elige el archivo y, si tiene contraseña, la pide.
 * Todo ocurre en este navegador: el archivo nunca se sube a ningún servidor.
 */
export const RestoreBackup: React.FC<RestoreBackupProps> = ({ onRestored, buttonLabel = 'Seleccionar archivo' }) => {
  const toast = useToast();
  const importBackupBundle = useAppStore((s) => s.importBackupBundle);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingEncrypted, setPendingEncrypted] = useState<{ file: File; hint?: string } | null>(null);
  const [importPassword, setImportPassword] = useState('');

  const handleFileImport = async (file: File, passphrase?: string) => {
    setIsImporting(true);
    try {
      const restored = await parseSessionBackupFile(file, passphrase);
      await importBackupBundle({
        profile: restored.profile,
        preferences: restored.preferences,
        jobs: restored.jobs,
        applications: restored.applications,
        coachData: restored.coach_data || undefined,
        chatHistory: restored.chat_history
      });
      setPendingEncrypted(null);
      setImportPassword('');
      toast.success(
        'Datos restaurados correctamente',
        `Perfil, ${restored.jobs.length} ofertas, ${restored.applications.length} postulaciones${restored.chat_history?.length ? ' y tu conversación con Opi' : ''}.`
      );
      onRestored?.();
    } catch (err: any) {
      if (err?.isEncrypted) {
        setPendingEncrypted({ file, hint: err.hint });
      } else if (passphrase) {
        toast.error('Contraseña incorrecta', 'Revisa la contraseña con la que creaste el respaldo.');
      } else {
        toast.error('Error al importar archivo: ' + (err?.message || err));
      }
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        accept=".oportia,.nexusjob,.json"
        aria-label="Archivo de respaldo"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFileImport(f);
        }}
        className="hidden"
      />
      {pendingEncrypted && (
        <form
          className="space-y-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-400/40"
          onSubmit={(e) => {
            e.preventDefault();
            if (importPassword) void handleFileImport(pendingEncrypted.file, importPassword);
          }}
        >
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
            Este respaldo está protegido con contraseña.
            {pendingEncrypted.hint ? ` Pista: «${pendingEncrypted.hint}»` : ''}
          </p>
          <input
            type="password"
            autoFocus
            aria-label="Contraseña del respaldo"
            placeholder="Contraseña del respaldo"
            value={importPassword}
            onChange={(e) => setImportPassword(e.target.value)}
            className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-ink-raised border border-black/10 dark:border-white/10 text-ink dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={!importPassword || isImporting} className="flex-1 min-h-[40px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer">
              Restaurar
            </button>
            <button type="button" onClick={() => { setPendingEncrypted(null); setImportPassword(''); }} className="min-h-[40px] px-3 rounded-xl border border-gray-300 dark:border-ink-line text-xs font-semibold text-ink dark:text-white cursor-pointer">
              Cancelar
            </button>
          </div>
        </form>
      )}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:outline-none"
      >
        <UploadCloud className="w-4 h-4" aria-hidden="true" />
        {isImporting ? 'Restaurando...' : buttonLabel}
      </button>
    </div>
  );
};
