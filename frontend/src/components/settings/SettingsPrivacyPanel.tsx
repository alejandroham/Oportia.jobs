import React, { useState } from 'react';
import { Shield, Download, UploadCloud, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../state/useAppStore';
import { useToast } from '../Toast';
import { api } from '../../api';
import { exportSessionBackupFile, getClientStore } from '../../utils/storage';
import { RestoreBackup } from './RestoreBackup';
import { PurgeDataDialog } from './PurgeDataDialog';

/** Tras borrar todo se recarga la app en la página principal; este aviso se muestra al volver. */
export const PURGED_FLAG = 'oportia_purged_notice';

export const SettingsPrivacyPanel: React.FC = () => {
  const toast = useToast();

  const {
    profile,
    preferences,
    jobs,
    applications,
    coachData,
    clearAllLocalData
  } = useAppStore();

  const [exportPassword, setExportPassword] = useState('');
  const [exportHint, setExportHint] = useState('');
  const [isExporting, setIsExporting] = useState(false);
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
            <p className="text-xs text-gray-500">Tus datos se guardan en este navegador (IndexedDB).</p>
          </div>
        </div>
        {/* 1.6.3 (DT-08): la política y los términos, siempre a mano */}
        <p className="text-xs text-ink-muted">
          Qué se envía al servidor, qué se guarda y tus derechos:{' '}
          <Link to="/privacidad" className="underline font-semibold text-brand-700 dark:text-brand-300">Política de privacidad</Link>
          {' · '}
          <Link to="/terminos" className="underline font-semibold text-brand-700 dark:text-brand-300">Términos de uso</Link>
        </p>

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
            <RestoreBackup />
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
