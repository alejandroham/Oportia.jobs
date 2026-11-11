import React, { useState, useRef } from 'react';
import {
  Shield,
  Download,
  Trash2,
  HardDrive,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCheck,
  Lock,
  Sparkles,
  Key,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import type {
  CandidateProfile,
  UserPreferences,
  JobPosting,
  ApplicationDraft
} from '../types';
import {
  exportSessionBackupFile,
  parseSessionBackupFile,
  clearClientStore
} from '../utils/storage';
import { api } from '../api';
import { useToast } from './Toast';

interface SessionPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CandidateProfile | null;
  preferences: UserPreferences | null;
  jobs: JobPosting[];
  applications: ApplicationDraft[];
  onRestoreData: (bundle: {
    profile: CandidateProfile | null;
    preferences: UserPreferences | null;
    jobs: JobPosting[];
    applications: ApplicationDraft[];
  }) => void;
  onPurgeData: () => void;
  onGoToWelcome?: () => void;
}

export const SessionPrivacyModal: React.FC<SessionPrivacyModalProps> = ({
  isOpen,
  onClose,
  profile,
  preferences,
  jobs,
  applications,
  onRestoreData,
  onPurgeData,
  onGoToWelcome
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [purgedState, setPurgedState] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Password for export encryption
  const [exportPassword, setExportPassword] = useState<string>('');
  const [exportHint, setExportHint] = useState<string>('');
  const [showExportPassword, setShowExportPassword] = useState<boolean>(false);

  // Decryption for import
  const [showImportPrompt, setShowImportPrompt] = useState<boolean>(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState<string>('');
  const [importHint, setImportHint] = useState<string | undefined>(undefined);

  if (!isOpen) return null;

  // 1. Descargar Respaldo Cifrado y Purgar Navegador
  const handleDownloadAndPurge = async () => {
    setLoadingAction('purge');
    try {
      await exportSessionBackupFile(profile, preferences, jobs, applications, exportPassword, exportHint);
      await api.purgeSettings().catch(() => {});
      await api.purgeAllServerData().catch(() => {});
      await clearClientStore();
      onPurgeData();
      setPurgedState(true);
      toast.success('Respaldo cifrado descargado y memoria local purgada.');
    } catch (e: any) {
      toast.error('Error al procesar: ' + (e?.message || e));
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Descargar Respaldo Cifrado y Conservar
  const handleDownloadAndKeep = async () => {
    try {
      await exportSessionBackupFile(profile, preferences, jobs, applications, exportPassword, exportHint);
      const isEnc = Boolean(exportPassword.trim());
      toast.success(
        isEnc ? 'Archivo cifrado (.oportia) descargado' : 'Archivo de respaldo (.json) descargado',
        isEnc ? 'Protegido con AES-256' : 'Texto plano (sin contraseña)'
      );
    } catch (e: any) {
      toast.error('Error al generar respaldo: ' + (e?.message || e));
    }
  };

  // 3. Purgar directamente sin descargar
  const handleDirectPurge = async () => {
    if (!window.confirm('¿Confirmas que deseas eliminar de forma definitiva tus datos personales, historial y claves de este equipo?')) {
      return;
    }
    setLoadingAction('purge');
    try {
      await api.purgeSettings().catch(() => {});
      await api.purgeAllServerData().catch(() => {});
      await clearClientStore();
      onPurgeData();
      setPurgedState(true);
      toast.success('Todos los datos personales y claves de IA han sido purgados.');
    } catch (e: any) {
      toast.error('Error al purgar datos: ' + (e?.message || e));
    } finally {
      setLoadingAction(null);
    }
  };

  // 4. Conservar en este equipo
  const handleKeepLocally = () => {
    toast.success('Tus datos continúan guardados en la memoria local de este navegador.');
    onClose();
  };

  // 5. Manejar Selección de Archivo para Restauración
  const handleFileSelected = async (file: File) => {
    try {
      setLoadingAction('import');
      const restored = await parseSessionBackupFile(file);
      onRestoreData(restored);
      toast.success('Sesión restaurada correctamente', `${restored.jobs.length} ofertas cargadas`);
      onClose();
    } catch (e: any) {
      if (e?.isEncrypted) {
        // File is encrypted: show password prompt modal
        setPendingFile(file);
        setImportHint(e.hint);
        setShowImportPrompt(true);
      } else {
        toast.error(e?.message || 'Error al importar el archivo de respaldo');
      }
    } finally {
      setLoadingAction(null);
    }
  };

  // 6. Confirmar descifrado con contraseña
  const handleConfirmDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFile) return;

    setLoadingAction('decrypting');
    try {
      const restored = await parseSessionBackupFile(pendingFile, importPassword);
      onRestoreData(restored);
      toast.success('Respaldo descifrado y restaurado con éxito');
      setShowImportPrompt(false);
      setPendingFile(null);
      setImportPassword('');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Contraseña incorrecta o archivo dañado');
    } finally {
      setLoadingAction(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white/95 dark:bg-[#1C1C1E]/95 border border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-xl p-5 sm:p-7 text-gray-900 dark:text-gray-100 transition-all">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* State A: Purgado Completo (Success confirmation & Welcome redirect) */}
        {purgedState ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Memoria Local & Claves de API Purgadas
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2 leading-relaxed">
                Tus datos personales, currículum vitae, vacantes, notas y claves de IA han sido eliminados por completo de este navegador y equipo (Cumplimiento Ley N° 19.628).
              </p>
            </div>
            <div className="pt-3 flex items-center justify-center space-x-3">
              <button
                onClick={() => {
                  setPurgedState(false);
                  onClose();
                  if (onGoToWelcome) onGoToWelcome();
                }}
                className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition"
              >
                Ir a Pantalla de Bienvenida
              </button>
            </div>
          </div>
        ) : showImportPrompt ? (
          /* State B: Descifrado de Respaldo Importado */
          <form onSubmit={handleConfirmDecrypt} className="space-y-4 py-2">
            <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 border-b border-black/5 dark:border-white/5 pb-3">
              <Lock className="w-6 h-6" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Archivo Protegido con Cifrado Militar AES-256
                </h3>
                <p className="text-[11px] text-gray-500">
                  Ingresa la contraseña con la que creaste este respaldo para descifrar tus datos.
                </p>
              </div>
            </div>

            {importHint && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs">
                <span className="font-bold">Pista de contraseña: </span>
                <span>{importHint}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Contraseña de Descifrado *
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Ingresa tu contraseña..."
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImportPrompt(false);
                  setPendingFile(null);
                  setImportPassword('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={Boolean(loadingAction)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              >
                {loadingAction === 'decrypting' ? 'Descifrando...' : 'Descifrar y Restaurar'}
              </button>
            </div>
          </form>
        ) : (
          /* State C: Main Sovereign Session Hub */
          <div className="space-y-5">
            
            {/* Header */}
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/50 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                    Soberanía de Datos & Privacidad
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    Ley N° 19.628 (Chile)
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Tus datos residen exclusivamente en tu navegador. Puedes cifrar tus respaldos o purgar todo rastro.
                </p>
              </div>
            </div>

            {/* Current Session Summary Card */}
            <div className="rounded-2xl bg-gray-50/80 dark:bg-zinc-900/60 p-3.5 border border-black/5 dark:border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span className="font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                  Candidato Activo:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {profile?.name || 'Perfil no registrado'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black/5 dark:border-white/5 text-[11px] text-gray-500 dark:text-gray-400">
                <div className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded-xl text-center">
                  <span className="block font-bold text-gray-900 dark:text-white text-xs">{jobs.length}</span>
                  Ofertas en Radar
                </div>
                <div className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded-xl text-center">
                  <span className="block font-bold text-gray-900 dark:text-white text-xs">{applications.length}</span>
                  Postulaciones
                </div>
                <div className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded-xl text-center">
                  <span className="block font-bold text-gray-900 dark:text-white text-xs">
                    {preferences?.learned_stories?.length || 0}
                  </span>
                  Historias STAR
                </div>
              </div>
            </div>

            {/* Optional Encryption Passphrase Box */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Cifrado Militar AES-256 de Respaldo</span>
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">Recomendado</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-snug">
                Ingresa una contraseña para cifrar el archivo descargado (<code className="text-[#20A88A] font-mono">.oportia</code>). Nadie podrá ver tu CV ni datos sin ella.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <div className="relative">
                  <input
                    type={showExportPassword ? 'text' : 'password'}
                    placeholder="Contraseña de cifrado..."
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 pr-8 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-medium focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowExportPassword(!showExportPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showExportPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Pista de contraseña (opcional)..."
                  value={exportHint}
                  onChange={(e) => setExportHint(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-medium focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Core Action Choices */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Gestión de Salida y Purgado
              </label>

              {/* Action 1: Download & Purge (Recommended) */}
              <button
                onClick={handleDownloadAndPurge}
                disabled={Boolean(loadingAction)}
                className="w-full text-left p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 hover:border-rose-400 dark:hover:border-rose-700 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 transition group flex items-start space-x-3 shadow-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-rose-700 dark:text-rose-300">
                      Descargar Respaldo Cifrado y Purgar Todo
                    </span>
                    <span className="text-[10px] bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 px-1.5 py-0.2 rounded-full font-medium">
                      Recomendado al salir
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    Exporta tu respaldo cifrado y elimina al instante tu CV, postulaciones y claves de IA de este equipo.
                  </p>
                </div>
              </button>

              {/* Action 2: Direct Purge without download */}
              <button
                onClick={handleDirectPurge}
                disabled={Boolean(loadingAction)}
                className="w-full text-left p-2.5 rounded-xl border border-black/5 dark:border-white/5 hover:border-rose-300 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between transition hover:bg-rose-50/40 dark:hover:bg-rose-950/20"
              >
                <span className="flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purgar sesión y claves de API de inmediato (Sin descargar)</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-rose-500">Borrado total</span>
              </button>

              {/* Action 3: Keep in this device */}
              <button
                onClick={handleKeepLocally}
                className="w-full text-left p-3 rounded-2xl border border-black/5 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-zinc-800/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition group flex items-start space-x-3 shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <HardDrive className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-xs text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    Mantener guardado en este equipo (Caché local)
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    Tus datos se conservan en la base de datos local (IndexedDB) para tu próxima sesión.
                  </p>
                </div>
              </button>

              {/* Action 4: Download & Keep */}
              <button
                onClick={handleDownloadAndKeep}
                className="w-full text-left p-3 rounded-2xl border border-black/5 dark:border-white/5 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/60 hover:bg-gray-50 dark:hover:bg-zinc-800 transition flex items-start space-x-3 shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-xs text-gray-900 dark:text-white">
                    Descargar Copia de Respaldo ({exportPassword ? '.oportia cifrado' : '.json'})
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    Genera un archivo portátil sin modificar ni borrar lo que tienes en pantalla.
                  </p>
                </div>
              </button>
            </div>

            {/* Restore / Import Section */}
            <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center justify-between">
                <span>Restaurar Datos desde Archivo Cifrado</span>
                <span className="text-[10px] text-[#20A88A] font-normal">.oportia, .nexusjob o .json</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept=".oportia,.nexusjob,.json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer transition text-center space-y-1.5 ${
                  isDragging
                    ? 'border-[#20A88A] bg-[#20A88A]/10'
                    : 'border-black/10 dark:border-white/10 hover:border-[#20A88A]/80 bg-gray-50/50 dark:bg-zinc-900/40'
                }`}
              >
                <UploadCloud className="w-5 h-5 mx-auto text-[#20A88A]" />
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                  Importar archivo <span className="font-mono text-[#20A88A]">.oportia</span> (o .nexusjob / .json)
                </p>
                <p className="text-[10px] text-gray-400">
                  Restaura tu perfil, radar, postulaciones y memoria STAR al instante con total seguridad.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
