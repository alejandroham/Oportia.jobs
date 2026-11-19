import React, { useState } from 'react';
import { Sparkles, ListChecks, ChevronDown, ChevronUp } from 'lucide-react';
import type { CvLength, CvOptions, WorkExperience } from '../../types';
import { formatExperiencePeriod } from '../shared/CvPreview';

const LENGTHS: Array<{ key: CvLength; label: string; hint: string }> = [
  { key: '1', label: '1 hoja', hint: 'Hasta 3 experiencias, 3 logros cada una' },
  { key: '2', label: '2 hojas', hint: 'Hasta 5 experiencias, 3 a 5 logros cada una (máximo recomendado para ATS)' }
];

/** Largo sugerido: con mucha trayectoria conviene 1 o 2 hojas. */
export const defaultCvLength = (experiences: number): CvLength => (experiences > 5 ? '1' : '2');

interface CvOptionsPanelProps {
  experiences: WorkExperience[];
  options: CvOptions;
  onChange: (next: CvOptions) => void;
  /** Lo que se usó en el último CV generado (para mostrar qué eligió Opi y por qué). */
  lastSelection?: { ids: string[]; reasons: Record<string, string>; method?: string } | null;
  disabled?: boolean;
}

/**
 * "Experiencias a incluir": la persona elige el largo del CV y si Opi elige las experiencias
 * (con la razón de cada una) o las marca ella misma. Las que no se desarrollan quedan en
 * "Experiencia anterior", una línea por cargo: nada se oculta ni se inventa.
 */
export const CvOptionsPanel: React.FC<CvOptionsPanelProps> = ({ experiences, options, onChange, lastSelection, disabled }) => {
  const manual = Array.isArray(options.experience_ids);
  // Plegado si ya hay un CV generado (para ahorrar scroll); abierto la primera vez.
  const [open, setOpen] = useState(!lastSelection?.ids?.length);
  const selected = new Set(manual ? options.experience_ids! : lastSelection?.ids ?? []);
  const reasons = lastSelection?.reasons ?? {};

  const setManual = (on: boolean) => {
    if (!on) return onChange({ ...options, experience_ids: null });
    // Al pasar a "Elegir yo" se parte de lo que eligió Opi (o de todas).
    const base = lastSelection?.ids?.length ? lastSelection.ids : experiences.map((e) => e.id);
    onChange({ ...options, experience_ids: base });
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...options, experience_ids: experiences.map((e) => e.id).filter((x) => next.has(x)) });
  };

  const pill = (active: boolean) =>
    `px-3 py-1.5 min-h-[36px] rounded-lg font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none disabled:opacity-50 ${
      active ? 'bg-brand-600 text-white shadow-xs' : 'text-ink-muted hover:text-ink dark:hover:text-white'
    }`;

  const lengthLabel = LENGTHS.find((l) => l.key === options.length)?.label ?? '';
  const count = manual ? options.experience_ids!.length : lastSelection?.ids?.length;
  const collapsedSummary = [
    lengthLabel,
    experiences.length
      ? count !== undefined
        ? `${manual ? 'Elegidas por ti' : 'Opi eligió'}: ${count} de ${experiences.length} experiencias`
        : 'Opi elegirá las experiencias'
      : null
  ].filter(Boolean).join(' · ');

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="w-full flex items-center justify-between gap-2 p-3 rounded-2xl border border-gray-200/80 dark:border-ink-line/60 bg-white dark:bg-ink-surface text-xs text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-ink-raised focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
      >
        <span>
          <span className="block text-sm font-bold text-ink dark:text-white">Largo y experiencias del CV</span>
          <span className="block text-ink-muted dark:text-ink-200">{collapsedSummary}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
      </button>
    );
  }

  return (
    <section aria-labelledby="cv-options-title" className="p-4 rounded-2xl border border-gray-200/80 dark:border-ink-line/60 bg-white dark:bg-ink-surface space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-expanded={true}
          className="inline-flex items-center gap-1.5 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none rounded-md"
        >
          <h3 id="cv-options-title" className="text-sm font-bold text-ink dark:text-white">
            Largo y experiencias del CV
          </h3>
          <ChevronUp className="w-4 h-4 text-ink-muted" aria-hidden="true" />
        </button>
        <div role="radiogroup" aria-label="Largo del CV" className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-ink-raised">
          {LENGTHS.map((l) => (
            <button
              key={l.key}
              type="button"
              role="radio"
              aria-checked={options.length === l.key}
              title={l.hint}
              disabled={disabled}
              onClick={() => onChange({ ...options, length: l.key })}
              className={pill(options.length === l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {experiences.length > 0 && (
        <>
          <div role="radiogroup" aria-label="Quién elige las experiencias" className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100 dark:bg-ink-raised w-fit">
            <button type="button" role="radio" aria-checked={!manual} disabled={disabled} onClick={() => setManual(false)} className={`${pill(!manual)} inline-flex items-center gap-1.5`}>
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Que Opi elija
            </button>
            <button type="button" role="radio" aria-checked={manual} disabled={disabled} onClick={() => setManual(true)} className={`${pill(manual)} inline-flex items-center gap-1.5`}>
              <ListChecks className="w-3.5 h-3.5" aria-hidden="true" /> Elegir yo
            </button>
          </div>

          {!manual && !lastSelection?.ids?.length && (
            <p className="text-ink-muted dark:text-ink-200">
              Opi desarrollará las experiencias más relevantes para esta oferta y te dirá por qué eligió cada una. Las demás
              quedan en <strong>Experiencia anterior</strong> (cargo, empresa y años), para que tu trayectoria se vea completa.
            </p>
          )}

          {(manual || lastSelection?.ids?.length) ? (
            <ul className="space-y-1.5" aria-label="Experiencias">
              {experiences.map((exp) => {
                const on = selected.has(exp.id);
                const period = formatExperiencePeriod(exp.start_date, exp.end_date);
                return (
                  <li key={exp.id}>
                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                        on ? 'border-brand-200 bg-brand-50/60 dark:border-brand-700/50 dark:bg-brand-950/30' : 'border-gray-200 dark:border-ink-line'
                      } ${manual ? 'cursor-pointer' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-brand-600"
                        checked={on}
                        disabled={!manual || disabled}
                        onChange={() => toggle(exp.id)}
                        aria-label={`${exp.role} en ${exp.company}`}
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink dark:text-white">
                          {exp.role} <span className="font-normal text-ink-muted dark:text-ink-200">· {exp.company}{period ? ` · ${period}` : ''}</span>
                        </span>
                        {on && !manual && reasons[exp.id] && (
                          <span className="block text-brand-800 dark:text-brand-200">{reasons[exp.id]}</span>
                        )}
                        {!on && <span className="block text-ink-muted dark:text-ink-200">Irá en «Experiencia anterior» (una línea).</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {manual && selected.size === 0 && (
            <p role="alert" className="text-amber-800 dark:text-amber-200">Marca al menos una experiencia para desarrollarla en el CV.</p>
          )}
        </>
      )}
    </section>
  );
};
