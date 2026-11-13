import React, { useState, useRef } from 'react';
import { Shield, Download, UploadCloud, Trash2 } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { useToast } from '../Toast';
import { api } from '../../api';
import { exportSessionBackupFile, parseSessionBackupFile } from '../../utils/storage';

export const SettingsPrivacyPanel: React.FC = () => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    profile,
    preferences,
    jobs,
    applications,
    clearAllLocalData,
    importBackupBundle
  } = useAppStore();

  const [exportPassword, setExportPassword] = useState('');
  const [exportHint, setExportHint] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      await exportSessionBackupFile(profile, preferences, jobs, applications, exportPassword, exportHint);
      const isEnc = Boolean(exportPassword.trim());
      toast.success(
        isEnc ? 'Respaldo cifrado (.oportia) descargado' : 'Archivo de respaldo (.json) descargado',
        isEnc ? 'Protegido con AES-256' : 'Texto plano (sin contraseña)'
      );
    } catch (err: any) {
      toast.error('Error al exportar respaldo: ' + (err?.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileImport = async (file: File) => {
    setIsImporting(true);
    try {
      const restored = await parseSessionBackupFile(file);
      await importBackupBundle(restored);
      toast.success('Datos restaurados correctamente', `${restored.jobs.length} ofertas cargadas`);
    } catch (err: any) {
      toast.error('Error al importar archivo: ' + (err?.message || err));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePurgeAll = async () => {
    if (!window.confirm('¿Confirmas que deseas eliminar de forma definitiva tus datos personales, historial y claves de este equipo? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await api.purgeSettings().catch(() => {});
      await api.purgeAllServerData().catch(() => {});
      await clearAllLocalData();
      toast.success('Todos los datos personales y claves de IA han sido borrados de este equipo.');
    } catch (err: any) {
      toast.error('Error al borrar datos: ' + (err?.message || err));
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
          <div className="p-4 rounded-xl border border-black/8 dark:border-white/8 bg-gray-50/50 dark:bg-zinc-800/40 space-y-3">
            <h3 className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
              <Download className="w-4 h-4 text-brand-600" />
              Descargar respaldo
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Exporta todo tu perfil, postulaciones, ofertas guardadas y memoria en un archivo descargable.
            </p>
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Contraseña de cifrado (opcional)..."
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                className="w-full text-xs min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-ink dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isExporting}
                className="w-full min-h-[44px] py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              >
                {isExporting ? 'Descargando...' : 'Descargar archivo (.oportia)'}
              </button>
            </div>
          </div>

          {/* Restore backup card */}
          <div className="p-4 rounded-xl border border-black/8 dark:border-white/8 bg-gray-50/50 dark:bg-zinc-800/40 space-y-3 flex flex-col justify-between">
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
            onClick={handlePurgeAll}
            className="px-4 py-2 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Borrar todos mis datos
          </button>
        </div>
      </div>
    </div>
  );
};
