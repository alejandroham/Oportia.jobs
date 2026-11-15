import React, { useId, useState } from 'react';
import { X, Plus } from 'lucide-react';

/**
 * Lista de etiquetas editable: escribe y presiona Enter o coma para agregar; × para quitar.
 * Reemplaza los campos "separados por coma", que borraban la coma al escribir y no
 * permitían agregar un segundo elemento.
 */
export interface TagInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Sugerencias que se agregan con un clic (las ya agregadas no se muestran). */
  suggestions?: string[];
  suggestionsLabel?: string;
  helpText?: string;
}

const norm = (s: string) => s.trim().toLowerCase();

export const TagInput: React.FC<TagInputProps> = ({
  label,
  values,
  onChange,
  placeholder,
  suggestions = [],
  suggestionsLabel = 'Sugerencias',
  helpText
}) => {
  const id = useId();
  const [draft, setDraft] = useState('');
  const current = values || [];

  const add = (raw: string) => {
    const parts = raw.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    const existing = new Set(current.map(norm));
    const next = [...current];
    for (const p of parts) {
      if (!existing.has(norm(p))) {
        next.push(p);
        existing.add(norm(p));
      }
    }
    onChange(next);
    setDraft('');
  };

  const remove = (i: number) => onChange(current.filter((_, idx) => idx !== i));
  const pending = suggestions.filter((s) => !current.some((v) => norm(v) === norm(s)));

  return (
    <div className="space-y-1.5 text-xs">
      <label htmlFor={id} className="block text-gray-700 dark:text-ink-200 font-semibold">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised focus-within:ring-2 focus-within:ring-brand-500/40">
        {current.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-white dark:bg-ink-surface border border-gray-200 dark:border-ink-line text-ink dark:text-gray-100 font-medium"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Quitar ${v}`}
              className="p-0.5 rounded-md text-gray-500 dark:text-ink-200 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]/.test(v)) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && current.length) {
              remove(current.length - 1);
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={current.length ? 'Agregar otra…' : placeholder}
          className="flex-1 min-w-[140px] bg-transparent py-1 px-1 text-ink dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-ink-300 focus:outline-none"
        />
      </div>
      {helpText && <p className="text-gray-600 dark:text-ink-200">{helpText}</p>}
      {pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-gray-600 dark:text-ink-200 font-medium">{suggestionsLabel}:</span>
          {pending.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 font-medium cursor-pointer"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
