import React, { useEffect, useRef, useState } from 'react';
import type { JobPosting, CandidateProfile, ApplicationDraft, CvOptions } from '../../types';
import { CvPreview } from '../shared/CvPreview';
import { Sparkles, FileText, Mail, Copy, Check, Printer, Loader2 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { printElement, buildDocumentTitle } from '../../utils/printDocument';
import { OpiAvatar } from '../../components/ui/OpiAvatar';
import { CvOptionsPanel, defaultCvLength } from './CvOptionsPanel';
import { QuickFeedback } from '../../components/feedback/QuickFeedback';
import { missingContact, withProfileHeader } from '../../utils/cvHeader';
import { atsChecks } from '../../utils/atsCheck';
import { AtsReview } from './AtsReview';
import { ConflictDialog } from './ConflictDialog';
import { findConflicts, ignoreConflict, type ExperienceConflict } from '../../utils/cvConflicts';
import { useAppStore } from '../../state/useAppStore';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface ApplicationDocumentsTabProps {
  job: JobPosting;
  application?: ApplicationDraft | null;
  profile: CandidateProfile | null;
  onAdaptCv: (options?: CvOptions) => Promise<void>;
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
  const letterRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const tailoredMarkdown = application?.tailored_cv_markdown || job.tailored_cv_markdown;
  const experiences = profile?.experiences ?? [];

  // Largo y experiencias del CV: parte de lo usado en el último CV de esta postulación.
  const initialOptions = (): CvOptions => ({
    length: application?.cv_length === '1' ? '1' : application?.cv_length === '2' ? '2' : defaultCvLength(experiences.length),
    experience_ids: application?.selection_method === 'manual' ? application.selected_experience_ids ?? [] : null,
    include_previous: application?.include_previous ?? true
  });
  const [cvOptions, setCvOptions] = useState<CvOptions>(initialOptions);
  useEffect(() => {
    setCvOptions(initialOptions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, application?.id]);
  const lastSelection = application?.selected_experience_ids?.length
    ? { ids: application.selected_experience_ids, reasons: application.selection_reasons ?? {}, method: application.selection_method }
    : null;
  const manualEmpty = Array.isArray(cvOptions.experience_ids) && cvOptions.experience_ids.length === 0 && experiences.length > 0;
  const targetPages = cvOptions.length === 'full' ? 2 : Number(cvOptions.length);
  // Antes de generar: si un mismo cargo tiene fechas o títulos distintos, se pregunta a la persona.
  const [conflicts, setConflicts] = useState<ExperienceConflict[]>([]);
  const adapt = () => {
    const found = findConflicts(profile?.experiences || []);
    if (found.length) {
      setConflicts(found);
      return;
    }
    void onAdaptCv(cvOptions);
  };
  const resolveNext = (remaining: ExperienceConflict[]) => {
    setConflicts(remaining);
    if (!remaining.length) void onAdaptCv(cvOptions);
  };
  const keepOne = async (c: ExperienceConflict, keepId: string) => {
    const dropId = keepId === c.a.id ? c.b.id : c.a.id;
    const { profile: current, setProfile } = useAppStore.getState();
    if (current) await setProfile({ ...current, experiences: current.experiences.filter((e) => e.id !== dropId), updated_at: new Date().toISOString() });
    toast.success('Listo: el CV usará el dato que elegiste. Tu perfil quedó actualizado.');
    resolveNext(findConflicts(useAppStore.getState().profile?.experiences || []));
  };
  const keepBoth = (c: ExperienceConflict) => {
    ignoreConflict(c.key);
    resolveNext(conflicts.filter((x) => x.key !== c.key));
  };
  const [pages, setPages] = useState<number | null>(null);
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
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-ink-raised/60 rounded-2xl border border-gray-200/80 dark:border-ink-line/60 text-xs">
        <div className="flex items-center gap-1 bg-white dark:bg-ink-surface p-1 rounded-xl border border-gray-200 dark:border-ink-line">
          <button
            type="button"
            onClick={() => setActiveDoc('cv')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              activeDoc === 'cv'
                ? 'bg-brand-600 text-white shadow-xs'
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
                ? 'bg-brand-600 text-white shadow-xs'
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
          onClick={adapt}
          disabled={isAdapting || manualEmpty}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-200 border border-brand-200 dark:border-brand-700/60 font-semibold hover:bg-brand-100 dark:hover:bg-brand-900/60 transition disabled:opacity-50"
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

      {conflicts.length > 0 && (
        <ConflictDialog conflicts={conflicts} onKeep={keepOne} onBothReal={keepBoth} onClose={() => setConflicts([])} />
      )}

      {activeDoc === 'cv' && profile && (
        <CvOptionsPanel
          key={job.id}
          experiences={experiences}
          options={cvOptions}
          onChange={setCvOptions}
          lastSelection={lastSelection}
          disabled={isAdapting}
        />
      )}

      {isAdapting && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-4 p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-700/50"
        >
          <OpiAvatar expression="pensando" size={64} decorative className="animate-pulse" />
          <div>
            <p className="text-sm font-bold text-ink dark:text-white">Opi está adaptando tu CV y tu carta…</p>
            <p className="text-xs text-ink-muted dark:text-ink-200">Elige tus experiencias más relevantes y las ajusta al largo que pediste, sin inventar nada. Puede tardar hasta un minuto.</p>
          </div>
        </div>
      )}

      {activeDoc === 'cv' && profile && missingContact(profile).length > 0 && (
        <p role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 text-xs text-amber-900 dark:text-amber-100">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            Tu CV saldrá sin {missingContact(profile).join(', ')}. Agrégalo en{' '}
            <Link to="/perfil" className="underline font-semibold">Mi perfil → Datos personales</Link>: aparecerá solo en el encabezado, tal como lo escribas.
          </span>
        </p>
      )}

      {tailoredMarkdown && !isAdapting && (application?.fidelity_warnings?.length ?? 0) > 0 && (
        <details className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-400/30 text-xs text-emerald-900 dark:text-emerald-100">
          <summary className="flex items-center gap-2 font-semibold cursor-pointer">
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            Oportia quitó {application!.fidelity_warnings!.length} {application!.fidelity_warnings!.length === 1 ? 'dato que la IA agregó' : 'datos que la IA agregó'} sin estar en tu perfil
          </summary>
          <ul className="list-disc pl-6 mt-2 space-y-0.5">
            {application!.fidelity_warnings!.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
          <p className="mt-2">Tu CV solo usa lo que está en tu perfil. Si alguno de estos datos es real, agrégalo en Mi perfil y vuelve a adaptar.</p>
        </details>
      )}

      {activeDoc === 'cv' && tailoredMarkdown && !isAdapting && profile && (
        <AtsReview
          checks={atsChecks(withProfileHeader(tailoredMarkdown, profile), pages, application?.fidelity_warnings?.length ?? 0)}
          match={application?.keyword_match}
          notes={application?.ats_notes}
        />
      )}

      {tailoredMarkdown && !isAdapting && <QuickFeedback moment="cv_adaptado" question="¿Te sirvió el CV adaptado?" />}

      {/* Contenido según pestaña */}
      {activeDoc === 'cv' ? (
        profile ? (
          <CvPreview
            profile={profile}
            tailoredMarkdown={tailoredMarkdown}
            showControls={true}
            documentLabel={job.title}
            targetPages={tailoredMarkdown ? targetPages : undefined}
            onPagesChange={setPages}
            autoFit
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
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-ink-border pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Carta de Presentación Formal
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLetter}
                    aria-label="Copiar carta de presentación al portapapeles"
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-gray-200 dark:border-ink-line text-xs font-semibold text-ink dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-raised transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                  >
                    {copiedLetter ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLetter ? 'Copiada' : 'Copiar texto'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void printElement(
                        letterRef.current,
                        buildDocumentTitle('Carta de presentación', profile?.name, job.company)
                      )
                    }
                    aria-label="Imprimir o guardar carta de presentación como PDF"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition shadow-xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / PDF</span>
                  </button>
                </div>
              </div>

              <div
                ref={letterRef}
                className="printable-cv bg-white text-gray-800 rounded-xl p-6 sm:p-8 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans formal-justify border border-gray-100"
              >
                {coverLetter}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-gray-300 dark:border-ink-line space-y-3">
              <OpiAvatar expression="curioso" size={96} className="mx-auto" decorative />
              <p className="text-xs text-gray-500">
                Aún no has generado una carta de presentación para esta vacante.
              </p>
              <button
                type="button"
                onClick={adapt}
                disabled={isAdapting}
                className="px-4 py-2 min-h-[44px] rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-xs hover:bg-brand-700 transition disabled:opacity-50 cursor-pointer"
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
