import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, UploadCloud, Search, RotateCcw } from 'lucide-react';
import { OpiAvatar } from '../ui/OpiAvatar';
import { useRestoreDialog } from '../settings/RestoreDataDialog';

interface CvRequiredGateProps {
  section: string;
  reason: string;
}

/** Sección bloqueada hasta cargar el CV: explica por qué y ofrece subirlo o recuperar los datos. */
export const CvRequiredGate: React.FC<CvRequiredGateProps> = ({ section, reason }) => (
  <section aria-labelledby="cv-gate-title" className="max-w-xl mx-auto mt-6 p-6 sm:p-8 rounded-3xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border shadow-sm text-center space-y-4">
    <OpiAvatar expression="curioso" size={96} className="mx-auto" decorative />
    <h1 id="cv-gate-title" className="inline-flex items-center gap-2 text-lg font-bold text-ink dark:text-white">
      <Lock className="w-4 h-4" aria-hidden="true" /> {section} se activa con tu CV
    </h1>
    <p className="text-sm text-ink-muted dark:text-ink-200 leading-relaxed">{reason}</p>
    <div className="flex flex-col sm:flex-row gap-2 justify-center">
      <Link
        to="/perfil"
        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"
      >
        <UploadCloud className="w-4 h-4" aria-hidden="true" /> Subir mi CV
      </Link>
      <button
        type="button"
        onClick={() => useRestoreDialog.getState().open()}
        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-gray-300 dark:border-ink-line text-sm font-semibold text-ink dark:text-white hover:bg-gray-50 dark:hover:bg-ink-raised cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" aria-hidden="true" /> Recuperar mis datos
      </button>
    </div>
    <Link to="/empleos" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300 underline">
      <Search className="w-3.5 h-3.5" aria-hidden="true" /> Mientras tanto, busca ofertas sin CV
    </Link>
  </section>
);
