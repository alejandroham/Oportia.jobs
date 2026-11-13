import React, { useState } from 'react';
import type { JobPosting, CandidateProfile, ApplicationDraft } from '../../types';
import { CvPreview } from '../shared/CvPreview';
import { Sparkles, FileText, Mail, Copy, Check, Printer, Loader2 } from 'lucide-react';
import { useToast } from '../../components/Toast';

interface ApplicationDocumentsTabProps {
  job: JobPosting;
  application?: ApplicationDraft | null;
  profile: CandidateProfile | null;
  onAdaptCv: () => Promise<void>;
  isAdapting: boolean;
}

export const ApplicationDocumentsTab: React.FC<ApplicationDocumentsTabProps> = ({
  job,
  application,
  profile,
  onAdaptCv,
  isAdapting
}) => {
  const [activeDoc, setActiveDoc] = useState<'cv' | 'cover_letter'>('cv');
  const [copiedLetter, setCopiedLetter] = useState(false);
  const toast = useToast();

  const tailoredMarkdown = application?.tailored_cv_markdown || job.tailored_cv_markdown;
  const coverLetter = application?.cover_letter || job.tailored_cover_letter;

  const handleCopyLetter = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    setCopiedLetter(true);
    toast.success('Carta de presentación copiada al portapapeles');
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Selector de Documento (CV vs Carta) y Botón Adaptar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-700/60 text-xs">
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setActiveDoc('cv')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeDoc === 'cv'
                ? 'bg-brand text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CV Adaptado</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveDoc('cover_letter')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeDoc === 'cover_letter'
                ? 'bg-brand text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Carta de Presentación</span>
          </button>
        </div>

        {/* Botón para forzar re-adaptación con IA */}
        <button
          type="button"
          onClick={onAdaptCv}
          disabled={isAdapting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand border border-brand-200 dark:border-brand-800/60 font-semibold hover:bg-brand-100 transition disabled:opacity-50"
        >
          {isAdapting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Adaptando con IA...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{tailoredMarkdown ? 'Volver a adaptar con IA' : 'Generar CV y carta adaptados'}</span>
            </>
          )}
        </button>
      </div>

      {/* Contenido según pestaña */}
      {activeDoc === 'cv' ? (
        profile ? (
          <CvPreview
            profile={profile}
            tailoredMarkdown={tailoredMarkdown}
            showControls={true}
          />
        ) : (
          <div className="p-8 text-center text-xs text-gray-500">
            Carga tu CV en Perfil para previsualizar y adaptar documentos.
          </div>
        )
      ) : (
        /* Carta de presentación */
        <div className="space-y-4">
          {coverLetter ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Carta de Presentación Formal
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLetter}
                    aria-label="Copiar carta de presentación al portapapeles"
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-semibold text-ink dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                  >
                    {copiedLetter ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLetter ? 'Copiada' : 'Copiar texto'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    aria-label="Imprimir o guardar carta de presentación como PDF"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-600 transition shadow-xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / PDF</span>
                  </button>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">
                {coverLetter}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-gray-300 dark:border-zinc-700 space-y-3">
              <Mail className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs text-gray-500">
                Aún no has generado una carta de presentación para esta vacante.
              </p>
              <button
                type="button"
                onClick={onAdaptCv}
                disabled={isAdapting}
                className="px-4 py-2 rounded-xl bg-[#20A88A] text-white text-xs font-semibold shadow-xs hover:bg-[#18856d] transition"
              >
                Generar carta adaptada con IA
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
