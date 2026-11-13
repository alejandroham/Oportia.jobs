import React from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';

export interface OnboardingStep1CVProps {
  isUploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tempName: string;
  setTempName: (val: string) => void;
  tempTitle: string;
  setTempTitle: (val: string) => void;
  tempSkills: string[];
  setTempSkills: (val: string[]) => void;
}

export const OnboardingStep1CV: React.FC<OnboardingStep1CVProps> = ({
  isUploading,
  onFileUpload,
  tempName,
  setTempName,
  tempTitle,
  setTempTitle,
  tempSkills,
  setTempSkills
}) => {
  return (
    <div className="space-y-4 animate-fade-in text-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Sube tu CV para empezar
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Extraemos tu experiencia y habilidades de forma segura en tu navegador sin inventar datos.
        </p>
      </div>

      {/* Upload Box */}
      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-brand-400/50 hover:border-brand-500 rounded-2xl bg-brand-50/30 dark:bg-brand-950/20 cursor-pointer transition">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-2">
          <Upload className="w-6 h-6" />
        </div>
        <span className="font-semibold text-ink dark:text-gray-200">
          {isUploading ? 'Analizando CV...' : 'Selecciona o arrastra tu archivo PDF o Word'}
        </span>
        <span className="text-xs text-ink-muted mt-0.5">PDF, DOCX o TXT (máximo 10 MB)</span>
        <input
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={onFileUpload}
          disabled={isUploading}
          className="hidden"
        />
      </label>

      {/* Extracted preview card */}
      {(tempName || tempTitle) && (
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-3">
          <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Información detectada en tu currículum
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="temp-name-input" className="text-xs text-ink-muted font-semibold uppercase">Tu Nombre</label>
              <input
                id="temp-name-input"
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full text-xs min-h-[44px] p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-ink dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="temp-title-input" className="text-xs text-ink-muted font-semibold uppercase">Titular / Cargo</label>
              <input
                id="temp-title-input"
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="w-full text-xs min-h-[44px] p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-ink dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-ink-muted font-semibold uppercase block mb-1">
              Habilidades clave ({tempSkills.length})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {tempSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 text-ink dark:text-gray-300 border border-black/5 flex items-center gap-1.5 text-xs font-medium"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => setTempSkills(tempSkills.filter((_, i) => i !== idx))}
                    aria-label={`Eliminar habilidad ${s}`}
                    className="hover:text-rose-500 cursor-pointer p-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
