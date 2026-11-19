import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Target } from 'lucide-react';
import type { AtsCheck } from '../../utils/atsCheck';

interface KeywordMatch {
  score: number;
  present: string[];
  missing: string[];
}

/** Coincidencia con la oferta y revisión ATS del CV adaptado (plegable). */
export const AtsReview: React.FC<{ checks: AtsCheck[]; match?: KeywordMatch | null; notes?: string[] }> = ({ checks, match, notes = [] }) => {
  const failing = checks.filter((c) => !c.ok).length;
  const [open, setOpen] = useState(failing > 0);
  return (
    <section aria-labelledby="ats-review-title" className="rounded-2xl border border-gray-200/80 dark:border-ink-line/60 bg-white dark:bg-ink-surface text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-3 text-left cursor-pointer rounded-2xl focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
      >
        <span>
          <span id="ats-review-title" className="block text-sm font-bold text-ink dark:text-white">Revisión para sistemas ATS</span>
          <span className="block text-ink-muted dark:text-ink-200">
            {match ? `Coincidencia con la oferta: ${match.score} % · ` : ''}
            {failing ? `${failing} ${failing === 1 ? 'punto por revisar' : 'puntos por revisar'}` : 'Todo en orden'}
          </span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-ink-muted" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-ink-muted" aria-hidden="true" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3">
          {match && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 font-semibold text-ink dark:text-white">
                <Target className="w-3.5 h-3.5" aria-hidden="true" /> Palabras clave de la oferta: tienes {match.present.length} de {match.present.length + match.missing.length} ({match.score} %)
              </p>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-ink-raised overflow-hidden" role="img" aria-label={`${match.score} % de coincidencia`}>
                <div className="h-full bg-brand-600" style={{ width: `${match.score}%` }} />
              </div>
              {match.present.length > 0 && (
                <p className="text-ink dark:text-gray-200"><strong>Usadas en tu CV:</strong> {match.present.join(', ')}</p>
              )}
              {match.missing.length > 0 && (
                <p className="text-ink-muted dark:text-ink-200">
                  <strong>Te faltan:</strong> {match.missing.join(', ')}. No se agregan porque no están en tu perfil; si alguna es real, agrégala en Mi perfil y vuelve a adaptar.
                </p>
              )}
            </div>
          )}
          <ul className="space-y-1" aria-label="Revisión ATS">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-1.5">
                {c.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" aria-label="Cumple" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" aria-label="Por revisar" />}
                <span>
                  <span className={c.ok ? 'text-ink dark:text-gray-200' : 'font-semibold text-amber-900 dark:text-amber-200'}>{c.label}</span>
                  {c.detail && <span className="block text-ink-muted dark:text-ink-200">{c.detail}</span>}
                </span>
              </li>
            ))}
            {notes.map((n) => (
              <li key={n} className="flex items-start gap-1.5 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" /> {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
