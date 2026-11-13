import React from 'react';
import type { CompetencyDiagnosticItem } from '../../types';
import { Target, Search, CheckCircle2, AlertCircle, BookOpen, Briefcase } from 'lucide-react';

interface GapsTabProps {
  competencies: CompetencyDiagnosticItem[];
  isLoading: boolean;
  onSearchCourse: (competencyName: string) => void;
}

export const GapsTab: React.FC<GapsTabProps> = ({
  competencies,
  isLoading,
  onSearchCourse
}) => {
  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-gray-400">
        Analizando competencias y brechas formativas...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#20A88A]" />
          Diagnóstico de Brechas y Competencias
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Habilidades requeridas por las vacantes a las que has postulado o evaluado, vinculadas a oportunidades de aprendizaje.
        </p>
      </div>

      <div className="space-y-3">
        {competencies.length > 0 ? (
          competencies.map((comp) => {
            const hasGaps = comp.source_job_gaps && comp.source_job_gaps.length > 0;

            return (
              <div
                key={comp.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-xs space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      {comp.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
                      {comp.category || 'Técnica'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-[11px]">
                      Nivel: <strong>{comp.declared_level || 'Básico'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onSearchCourse(comp.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#20A88A] hover:bg-teal-100 text-xs font-semibold border border-teal-200/60 dark:border-teal-800/40 transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Buscar curso</span>
                    </button>
                  </div>
                </div>

                {/* Evidencias en CV */}
                {comp.evidences && comp.evidences.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      Evidencias demostradas en tu CV:
                    </span>
                    <ul className="space-y-1 pl-1 text-gray-600 dark:text-gray-300">
                      {comp.evidences.map((ev, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ofertas de donde proviene la brecha */}
                {hasGaps && (
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 space-y-1 text-amber-900 dark:text-amber-200">
                    <span className="font-bold text-[11px] flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-amber-600" />
                      Detectada como brecha en las siguientes vacantes:
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      {comp.source_job_gaps.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-xs text-gray-400">
            Aún no se han identificado brechas formativas. Evalúa más ofertas en el radar para que Opi detecte oportunidades de mejora.
          </div>
        )}
      </div>
    </div>
  );
};
