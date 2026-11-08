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
  Sparkles
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
}

export const SessionPrivacyModal: React.FC<SessionPrivacyModalProps> = ({
  isOpen,
  onClose,
  profile,
  preferences,
  jobs,
  applications,
  onRestoreData,
  onPurgeData
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [purgedState, setPurgedState] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Descargar y Limpiar
  const handleDownloadAndPurge = async () => {
    setLoadingAction('purge');
    try {
      exportSessionBackupFile(profile, preferences, jobs, applications);
      await clearClientStore();
      onPurgeData();
      setPurgedState(true);
      toast.success('Respaldo descargado y memoria local purgada.');
    } catch (e: any) {
      toast.error('Error al procesar: ' + (e?.message || e));
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Descargar y Conservar
  const handleDownloadAndKeep = () => {
    try {
      exportSessionBackupFile(profile, preferences, jobs, applications);
      toast.success('Archivo de respaldo descargado exitosamente.');
    } catch (e: any) {
      toast.error('Error al generar respaldo: ' + (e?.message || e));
    }
  };

  // 3. Conservar en este equipo
  const handleKeepLocally = () => {
    toast.success('Tus datos continúan guardados en la memoria local de este navegador.');
    onClose();
  };

  // 4. Restaurar Archivo
  const handleFileSelected = async (file: File) => {
    try {
      setLoadingAction('import');
      const restored = await parseSessionBackupFile(file);
      onRestoreData(restored);
      toast.success('Sesión restaurada correctamente', `${restored.jobs.length} ofertas cargadas`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Error al importar el archivo de respaldo');
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

        {purgedState ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Memoria Local Purgada Exitosamente
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2 leading-relaxed">
                Tu respaldo se ha descargado a tu disco y todos tus datos personales, currículum vitae y postulaciones han sido eliminados por completo de este navegador.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  setPurgedState(false);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/50 shadow-inner">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                    Soberanía de Datos & Privacidad
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    Zero-Knowledge
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Tus datos personales y postulaciones viven exclusivamente en la memoria local de tu navegador.
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
                    {preferences?.learned_star_stories?.length || 0}
                  </span>
                  Historias STAR
                </div>
              </div>
            </div>

            {/* Core Action Choices */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Gestión de Salida o Cierre de Sesión
              </label>

              {/* Action 1: Download & Purge (Recommended for shared/public machines) */}
              <button
                onClick={handleDownloadAndPurge}
                disabled={Boolean(loadingAction)}
                className="w-full text-left p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 hover:border-rose-400 dark:hover:border-rose-700 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 transition group flex items-start space-x-3"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-rose-700 dark:text-rose-300">
                      Descargar Respaldo y Limpiar Navegador
                    </span>
                    <span className="text-[10px] bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 px-1.5 py-0.2 rounded-full font-medium">
                      Recomendado en equipos compartidos
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    Descarga tu archivo <code className="text-rose-600 dark:text-rose-400 font-mono">nexusjob_backup.json</code> y purga todo rastro personal de este equipo.
                  </p>
                </div>
              </button>

              {/* Action 2: Keep in this device */}
              <button
                onClick={handleKeepLocally}
                className="w-full text-left p-3.5 rounded-2xl border border-black/5 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-zinc-800/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition group flex items-start space-x-3 shadow-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-xs text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    Mantener guardado en este equipo (Caché local)
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    Tus datos se conservan en la base de datos local (IndexedDB) de este navegador para tu próxima sesión.
                  </p>
                </div>
              </button>

              {/* Action 3: Download & Keep */}
              <button
                onClick={handleDownloadAndKeep}
                className="w-full text-left p-3.5 rounded-2xl border border-black/5 dark:border-white/5 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/60 hover:bg-gray-50 dark:hover:bg-zinc-800 transition flex items-start space-x-3 shadow-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Download className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-xs text-gray-900 dark:text-white">
                    Descargar Copia de Respaldo (.json)
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
                <span>Restaurar Datos desde Otro Dispositivo</span>
                <span className="text-[10px] text-blue-500 font-normal">Arrastra o haz clic</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
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
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-black/10 dark:border-white/10 hover:border-blue-400/80 bg-gray-50/50 dark:bg-zinc-900/40'
                }`}
              >
                <UploadCloud className="w-5 h-5 mx-auto text-blue-500" />
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                  Importar archivo <span className="font-mono text-blue-600 dark:text-blue-400">nexusjob_backup.json</span>
                </p>
                <p className="text-[10px] text-gray-400">
                  Reconstruye tu perfil, radar, postulaciones y memoria STAR al instante.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
