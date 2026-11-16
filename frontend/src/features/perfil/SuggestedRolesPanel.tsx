import React from 'react';
import { Sparkles, Plus, Check, RefreshCw } from 'lucide-react';
import type { SuggestedRole } from '../../types';
import { normalizeText } from '../../utils/searchText';

const TONE: Record<string, string> = {
  directo: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  ascenso: 'bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
  transferible: 'bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200'
};

interface SuggestedRolesPanelProps {
  roles: SuggestedRole[];
  targetRoles: string[];
  onToggle: (title: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  hasCv: boolean;
}

/** "Qué busco": cargos afines a tu experiencia sugeridos por la IA, cada uno con un resumen de por qué calza. */
export const SuggestedRolesPanel: React.FC<SuggestedRolesPanelProps> = ({ roles, targetRoles, onToggle, onRefresh, isRefreshing, hasCv }) => {
  const chosen = new Set(targetRoles.map(normalizeText));
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            Cargos sugeridos según tu experiencia
          </h3>
          <p className="text-xs text-gray-600 dark:text-ink-200">
            Opi los propone a partir de tu CV: tu experiencia directa, tu siguiente paso y cargos donde sirven tus habilidades.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || !hasCv}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-brand-300 dark:border-brand-700/60 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isRefreshing ? 'Analizando…' : roles.length ? 'Actualizar con IA' : 'Sugerir cargos con IA'}
        </button>
      </div>

      {!hasCv && <p className="text-xs text-gray-600 dark:text-ink-200">Primero sube tu CV en «Mi CV».</p>}
      {hasCv && roles.length === 0 && !isRefreshing && (
        <p className="text-xs text-gray-600 dark:text-ink-200">Aún no hay sugerencias. Pulsa «Sugerir cargos con IA».</p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {roles.map((r) => {
          const added = chosen.has(normalizeText(r.title));
          return (
            <li key={r.title} className="p-3.5 rounded-xl border border-gray-200 dark:border-ink-line space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-ink dark:text-white">{r.title}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${TONE[r.category] || TONE.directo}`}>{r.category_label || r.category}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggle(r.title)}
                  aria-pressed={added}
                  aria-label={added ? `Quitar ${r.title} de lo que busco` : `Agregar ${r.title} a lo que busco`}
                  className={`inline-flex items-center gap-1 shrink-0 min-h-[36px] px-2.5 rounded-lg font-semibold cursor-pointer ${
                    added
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border border-gray-300 dark:border-ink-line text-ink dark:text-white hover:bg-gray-50 dark:hover:bg-ink-hover'
                  }`}
                >
                  {added ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                  {added ? 'Lo busco' : 'Agregar'}
                </button>
              </div>
              {r.summary && <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{r.summary}</p>}
              {r.evidence?.length > 0 && <p className="text-gray-500 dark:text-ink-200">Según tu CV: {r.evidence.join(' · ')}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
