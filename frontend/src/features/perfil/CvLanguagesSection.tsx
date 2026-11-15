import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export const LANGUAGE_LEVELS = ['Básico', 'Intermedio', 'Avanzado', 'Nativo'];

const inputCls =
  'w-full min-h-[40px] p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none';

/** Idiomas con nivel. Se guarda como { idioma: nivel }. */
export const CvLanguagesSection: React.FC<{
  languages: Record<string, string>;
  onChange: (l: Record<string, string>) => void;
}> = ({ languages, onChange }) => {
  const entries = Object.entries(languages || {});
  const set = (list: Array<[string, string]>) => onChange(Object.fromEntries(list));
  return (
    <div className="space-y-2 text-xs">
      <span className="block text-gray-700 dark:text-ink-200 font-semibold">Idiomas</span>
      {entries.map(([lang, level], i) => (
        <div key={i} className="grid grid-cols-[1fr_minmax(0,9rem)_auto] gap-2 items-center">
          <input
            aria-label={`Idioma ${i + 1}`}
            className={inputCls}
            value={lang}
            placeholder="Ej. Inglés"
            onChange={(e) => set(entries.map((x, idx) => (idx === i ? [e.target.value, x[1]] : x)))}
          />
          <select
            aria-label={`Nivel de ${lang || 'idioma'}`}
            className={inputCls}
            value={level || 'Intermedio'}
            onChange={(e) => set(entries.map((x, idx) => (idx === i ? [x[0], e.target.value] : x)))}
          >
            {[...new Set([...LANGUAGE_LEVELS, level].filter(Boolean))].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label={`Quitar ${lang || 'idioma'}`}
            onClick={() => set(entries.filter((_, idx) => idx !== i))}
            className="p-2 min-h-[40px] rounded-lg text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => set([...entries, ['', 'Intermedio']])}
        className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-dashed border-brand-400 text-brand-700 dark:text-brand-300 font-semibold hover:bg-brand-50 dark:hover:bg-brand-950/40 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Agregar idioma
      </button>
    </div>
  );
};
