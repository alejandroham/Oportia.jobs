import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ProfileLink } from '../../types';

/** Enlaces con nombre (no solo LinkedIn). */
export const LINK_LABELS = ['LinkedIn', 'Portafolio', 'GitHub', 'Sitio web', 'Behance', 'Registro de Prestadores de Salud', 'Otro'];

const inputCls =
  'w-full min-h-[40px] p-2 rounded-xl border border-gray-200 dark:border-ink-line bg-gray-50 dark:bg-ink-raised text-gray-900 dark:text-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none';

export const CvLinksSection: React.FC<{ links: ProfileLink[]; onChange: (l: ProfileLink[]) => void }> = ({ links, onChange }) => {
  const items = links || [];
  const update = (i: number, patch: Partial<ProfileLink>) =>
    onChange(items.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2 text-xs sm:col-span-2">
      <span className="block text-gray-600 dark:text-ink-200 font-medium">Enlaces</span>
      {items.map((l, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] gap-2 items-center">
          <select
            aria-label={`Tipo de enlace ${i + 1}`}
            className={inputCls}
            value={LINK_LABELS.includes(l.label) ? l.label : 'Otro'}
            onChange={(e) => update(i, { label: e.target.value })}
          >
            {LINK_LABELS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <input
            aria-label={`Dirección del enlace ${i + 1}`}
            type="url"
            className={inputCls}
            value={l.url}
            placeholder="https://…"
            onChange={(e) => update(i, { url: e.target.value })}
          />
          <button
            type="button"
            aria-label={`Quitar enlace ${l.label}`}
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="p-2 min-h-[40px] rounded-lg text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { label: items.length ? 'Sitio web' : 'LinkedIn', url: '' }])}
        className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-dashed border-brand-400 text-brand-700 dark:text-brand-300 font-semibold hover:bg-brand-50 dark:hover:bg-brand-950/40 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Agregar enlace
      </button>
    </div>
  );
};
