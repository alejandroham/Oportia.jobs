import React from 'react';
import { Dialog } from '../../components/ui/Dialog';
import type { ExperienceConflict } from '../../utils/cvConflicts';
import { formatPeriod } from '../../utils/cvFormat';

interface ConflictDialogProps {
  conflicts: ExperienceConflict[];
  onKeep: (conflict: ExperienceConflict, keepId: string) => void;
  onBothReal: (conflict: ExperienceConflict) => void;
  onClose: () => void;
}

/** Antes de generar el CV: el mismo cargo aparece con fechas o títulos distintos. La persona decide. */
export const ConflictDialog: React.FC<ConflictDialogProps> = ({ conflicts, onKeep, onBothReal, onClose }) => {
  const c = conflicts[0];
  if (!c) return null;
  const option = (e: typeof c.a) => (
    <button
      type="button"
      onClick={() => onKeep(c, e.id)}
      className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-ink-line hover:border-brand-400 hover:bg-brand-50/60 dark:hover:bg-brand-950/30 cursor-pointer"
    >
      <span className="block font-semibold text-ink dark:text-white">{e.role} — {e.company}</span>
      <span className="block text-ink-muted dark:text-ink-200">{formatPeriod(e) || 'Sin fechas'}{e.location ? ` | ${e.location}` : ''}</span>
      <span className="block mt-1 text-brand-700 dark:text-brand-300 font-semibold">Usar este</span>
    </button>
  );
  return (
    <Dialog
      isOpen
      onClose={onClose}
      title="¿Cuál es el dato correcto?"
      description="Tu perfil tiene este cargo dos veces con fechas o títulos distintos. Oportia no elige por ti: dinos cuál usar en el CV."
      maxWidth="lg"
    >
      <div className="space-y-3 text-xs">
        <div className="grid sm:grid-cols-2 gap-2">
          {option(c.a)}
          {option(c.b)}
        </div>
        <button type="button" onClick={() => onBothReal(c)} className="underline font-semibold text-ink dark:text-white cursor-pointer">
          Son dos cargos distintos: mantener ambos
        </button>
        {conflicts.length > 1 && <p className="text-ink-muted dark:text-ink-200">Quedan {conflicts.length - 1} por revisar.</p>}
      </div>
    </Dialog>
  );
};
