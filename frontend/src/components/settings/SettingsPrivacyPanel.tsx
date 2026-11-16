import React, { useState, useRef } from 'react';
import { Shield, Download, UploadCloud, Trash2 } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { useToast } from '../Toast';
import { api } from '../../api';
import { exportSessionBackupFile, parseSessionBackupFile, getClientStore } from '../../utils/storage';
import { PurgeDataDialog } from './PurgeDataDialog';

/** Tras borrar todo se recarga la app en la página principal; este aviso se muestra al volver. */
export const PURGED_FLAG = 'oportia_purged_notice';

export const SettingsPrivacyPanel: React.FC = () => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    profile,
    preferences,
    jobs,
    applications,
    coachData,
    clearAllLocalData,
    importBackupBundle
  } = useAppStore();

  const [exportPassword, setExportPassword] = useState('');
  const [exportHint, setExportHint] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  // Respaldo cifrado esperando su contraseña
  const [pendingEncrypted, setPendingEncrypted] = useState<{ file: File; hint?: string } | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [isPurgeOpen, setIsPurgeOpen] = useState(false);

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      const chatHistory = (await getClientStore<unknown[]>('oportia_chat_history')) || [];
      const { encrypted } = await exportSessionBackupFile(
        { profile, preferences, jobs, applications, coachData, chatHistory },
        { passphrase: exportPassword, hint: exportHint }
      );
      toast.success(
        encrypted ? 'Respaldo cifrado (.oportia) descargado' : 'Respaldo descargado (.json)',
        encrypted
          ? 'Protegido con tu contraseña (AES-256). Sin ella no se puede abrir.'
          : 'Sin contraseña: cualquiera que tenga el archivo puede leerlo.'
      );
    } catch (err: any) {
      toast.error('Error al exportar respaldo: ' + (err?.message || err));
    } finally {
      setIsExporting(false);
    }
  };

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
    } catch (err: any) {
      if (err?.isEncrypted) {
        // Respaldo con contraseña: se pide antes de restaurar.
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

  const handlePurgeAll = async () => {
    try {
      await api.purgeSettings().catch(() => {});
      await api.purgeAllServerData().catch(() => {});
      await clearAllLocalData();
      // Recarga completa en la página principal: la app parte de cero (portada, guía de inicio y
      // "Conecta la IA (opcional)"), sin nada en memoria.
      sessionStorage.setItem(PURGED_FLAG, '1');
      window.location.replace('/');
    } catch (err: any) {
      toast.error('Error al borrar datos: ' + (err?.message || err));
      setIsPurgeOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="apple-glass apple-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Respaldo y Soberanía de Datos</h2>
            <p className="text-xs text-gray-500">Tus datos viven exclusivamente en este navegador (IndexedDB).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Download backup card */}
          <div className="p-4 rounded-xl border border-black/[0.08] dark:border-ink-border bg-gray-50/50 dark:bg-ink-raised/40 space-y-3">
            <h3 className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
              <Download className="w-4 h-4 text-brand-700 dark:text-brand-300" />
              Descargar respaldo
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Incluye tu CV y perfil, qué buscas, tus logros, lo que Opi sabe de ti, ofertas, postulaciones, Aprender y tu conversación con Opi. Tus claves de IA no se incluyen.
            </p>
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Contraseña de cifrado (opcional)..."
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-ink-raised border border-black/10 dark:border-white/10 text-ink dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              />
              {exportPassword.trim() && (
                <input
                  type="text"
                  placeholder="Pista para recordarla (opcional, NO escribas la contraseña)"
                  aria-label="Pista de la contraseña (opcional)"
                  value={exportHint}
                  onChange={(e) => setExportHint(e.target.value)}
                  className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-ink-raised border border-black/10 dark:border-white/10 text-ink dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                />
              )}
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isExporting}
                className="w-full min-h-[44px] py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              >
                {isExporting ? 'Descargando...' : 'Descargar archivo (.oportia)'}
              </button>
            </div>
          </div>

          {/* Restore backup card */}
          <div className="p-4 rounded-xl border border-black/[0.08] dark:border-ink-border bg-gray-50/50 dark:bg-ink-raised/40 space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                Restaurar respaldo
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed mt-1">
                Restaura un archivo previamente descargado (.oportia o .nexusjob) en tu navegador.
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".oportia,.nexusjob,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileImport(f);
              }}
              className="hidden"
            />
            {pendingEncrypted && (
              <form
                className="space-y-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-400/40"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (importPassword) handleFileImport(pendingEncrypted.file, importPassword);
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
              className="w-full min-h-[44px] py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:outline-none"
            >
              {isImporting ? 'Restaurando...' : 'Seleccionar archivo'}
            </button>
          </div>
        </div>

        {/* Right to be forgotten */}
        <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400">Derecho al Olvido (Borrar Todo)</h3>
            <p className="text-xs text-ink-muted">Elimina de forma permanente todo dato personal, CV y claves de este navegador.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPurgeOpen(true)}
            className="px-4 py-2 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Borrar todos mis datos
          </button>
        </div>
      </div>

      <PurgeDataDialog
        isOpen={isPurgeOpen}
        onClose={() => setIsPurgeOpen(false)}
        onDownloadBackup={handleDownloadBackup}
        onConfirm={handlePurgeAll}
      />
    </div>
  );
};
