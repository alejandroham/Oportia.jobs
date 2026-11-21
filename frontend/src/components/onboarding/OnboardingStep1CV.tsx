import React from 'react';
import { Upload, CheckCircle2, Info, ArrowLeftRight } from 'lucide-react';
import type { WorkExperience } from '../../types';
import { BASIC_READING_LABEL } from '../../api';

export interface OnboardingStep1CVProps {
  isUploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tempName: string;
  setTempName: (val: string) => void;
  tempTitle: string;
  setTempTitle: (val: string) => void;
  tempSkills: string[];
  setTempSkills: (val: string[]) => void;
  /** Si el CV se leyó sin IA: el aviso del servidor (se muestra fijo, no solo en un aviso pasajero). */
  basicReadingNote?: string | null;
  /** 1.6.8 (DT-19): experiencias detectadas, para confirmarlas o corregirlas antes de seguir. */
  experiences?: WorkExperience[];
  setExperiences?: (val: WorkExperience[]) => void;
}

export const OnboardingStep1CV: React.FC<OnboardingStep1CVProps> = ({
  isUploading,
  onFileUpload,
  tempName,
  setTempName,
  tempTitle,
  setTempTitle,
  tempSkills,
  setTempSkills,
  basicReadingNote,
  experiences = [],
  setExperiences
}) => {
  const updateExp = (idx: number, patch: Partial<WorkExperience>) =>
    setExperiences?.(experiences.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-4 animate-fade-in text-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Sube tu CV para empezar
        </h2>
        <p className="text-xs text-gray-500 dark:text-ink-200">
          Leemos tu CV en nuestro servidor solo para extraer tus datos y lo descartamos al instante. Lo que guardas queda
          en este navegador. No inventamos datos.{' '}
          <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-brand-700 dark:text-brand-300">
            Política de privacidad
          </a>
        </p>
      </div>

      {/* Upload Box */}
      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-brand-400/50 hover:border-brand-500 rounded-2xl bg-brand-50/30 dark:bg-brand-950/20 cursor-pointer transition">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 flex items-center justify-center mb-2">
          <Upload className="w-6 h-6" />
        </div>
        <span className="font-semibold text-ink dark:text-gray-200">
          {isUploading ? 'Analizando CV...' : 'Selecciona o arrastra tu archivo PDF o Word'}
        </span>
        <span className="text-xs text-ink-muted mt-0.5">PDF, Word (.docx) o TXT · máximo 4 MB</span>
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
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-ink-raised/60 border border-black/5 dark:border-white/5 space-y-3">
          <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Información detectada en tu currículum
          </span>
          {basicReadingNote != null && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs leading-snug">
                <span className="font-semibold">{BASIC_READING_LABEL}.</span>{' '}
                {basicReadingNote || 'Revisa los datos: puede que algunos cargos o empresas no estén bien separados.'}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="temp-name-input" className="text-xs text-ink-muted font-semibold uppercase">Tu Nombre</label>
              <input
                id="temp-name-input"
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full text-xs min-h-[44px] p-2.5 rounded-xl bg-white dark:bg-ink-raised border border-black/10 dark:border-white/10 text-ink dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="temp-title-input" className="text-xs text-ink-muted font-semibold uppercase">Titular / Cargo</label>
              <input
                id="temp-title-input"
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="w-full text-xs min-h-[44px] p-2.5 rounded-xl bg-white dark:bg-ink-raised border border-black/10 dark:border-white/10 text-ink dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              />
            </div>
          </div>

          {experiences.length > 0 && setExperiences && (
            <fieldset className="space-y-2">
              <legend className="text-xs text-ink-muted font-semibold uppercase mb-1">
                Tu experiencia ({experiences.length}) · revisa que el cargo y la empresa estén bien
              </legend>
              <ul className="space-y-2">
                {experiences.slice(0, 8).map((exp, idx) => (
                  <li key={exp.id || idx} className="p-2.5 rounded-xl bg-white dark:bg-ink-raised border border-black/5 dark:border-white/10 space-y-2">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1.5">
                      <div>
                        <label htmlFor={`exp-role-${idx}`} className="text-[11px] text-ink-muted font-semibold">Cargo</label>
                        <input
                          id={`exp-role-${idx}`}
                          type="text"
                          value={exp.role}
                          onChange={(e) => updateExp(idx, { role: e.target.value })}
                          className="w-full text-xs min-h-[40px] px-2 rounded-lg bg-gray-50 dark:bg-ink-surface border border-black/10 dark:border-white/10 text-ink dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateExp(idx, { role: exp.company, company: exp.role })}
                        aria-label={`Intercambiar cargo y empresa de «${exp.role || 'esta experiencia'}»`}
                        title="Intercambiar cargo y empresa"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                      >
                        <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <div>
                        <label htmlFor={`exp-company-${idx}`} className="text-[11px] text-ink-muted font-semibold">Empresa</label>
                        <input
                          id={`exp-company-${idx}`}
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExp(idx, { company: e.target.value })}
                          className="w-full text-xs min-h-[40px] px-2 rounded-lg bg-gray-50 dark:bg-ink-surface border border-black/10 dark:border-white/10 text-ink dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-ink-muted">{[exp.start_date, exp.end_date].filter(Boolean).join(' – ') || 'Sin fechas'}</p>
                  </li>
                ))}
              </ul>
              {experiences.length > 8 && (
                <p className="text-[11px] text-ink-muted">Las demás experiencias las puedes revisar después en Mi perfil.</p>
              )}
            </fieldset>
          )}

          <div>
            <label className="text-xs text-ink-muted font-semibold uppercase block mb-1">
              Habilidades clave ({tempSkills.length})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {tempSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-ink-hover text-ink dark:text-gray-300 border border-black/5 flex items-center gap-1.5 text-xs font-medium"
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
