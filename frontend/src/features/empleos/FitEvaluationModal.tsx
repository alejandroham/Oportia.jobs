import React, { useState, useEffect } from 'react';
import type { FitEvaluation, JobPosting } from '../../types';
import { X, Sparkles, UserCheck, ShieldCheck, Cpu, Search, Briefcase, Award } from 'lucide-react';

interface FitEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: FitEvaluation | null;
  job: JobPosting | null;
}

export const FitEvaluationModal: React.FC<FitEvaluationModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  job
}) => {
  const [activeTab, setActiveTab] = useState<'director' | 'evaluators' | 'matrix' | 'potential'>('director');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !evaluation) return null;

  const evaluators = evaluation.committee_evaluations || [];
  const matrix = evaluation.requirements_matrix || [];
  const director = evaluation.director_synthesis;
  const potential = evaluation.potential_projection;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-fade-in">
        {/* Cabecera */}
        <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-gray-50/70 dark:bg-zinc-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#20A88A]">{evaluation.overall_score}%</span>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Evaluación de Compatibilidad (5 Perspectivas)
              </h3>
            </div>
            {job && (
              <p className="text-xs text-gray-500 truncate max-w-md">
                {job.title} en {job.company}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-navegación por pestañas */}
        <div className="flex border-b border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900 px-4 gap-2 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('director')}
            className={`py-3 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'director'
                ? 'border-[#20A88A] text-[#20A88A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dictamen del Director
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evaluators')}
            className={`py-3 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'evaluators'
                ? 'border-[#20A88A] text-[#20A88A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            5 Evaluadores Especializados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'border-[#20A88A] text-[#20A88A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Requisitos vs CV ({matrix.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('potential')}
            className={`py-3 px-3 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'potential'
                ? 'border-[#20A88A] text-[#20A88A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Proyección Potencial
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-xs sm:text-sm space-y-4">
          {/* TAB 1: Dictamen */}
          {activeTab === 'director' && (
            <div className="space-y-4 leading-relaxed">
              <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                  Resumen Ejecutivo
                </h4>
                <p className="text-gray-800 dark:text-gray-200">
                  {director?.summary || evaluation.recommendation_summary}
                </p>
              </div>

              {director?.suggested_actions && director.suggested_actions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Acciones sugeridas antes de enviar tu postulación:
                  </h4>
                  <ul className="space-y-1.5 pl-2">
                    {director.suggested_actions.map((act, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                        <span className="text-[#20A88A] font-bold">✓</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 5 Evaluadores */}
          {activeTab === 'evaluators' && (
            <div className="space-y-3">
              {evaluators.length > 0 ? (
                evaluators.map((ev, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/70 dark:border-zinc-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                        {ev.role_name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-[#20A88A]">
                        {ev.score}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {ev.justification}
                    </p>
                    {ev.key_question && (
                      <div className="text-[11px] text-gray-500 italic bg-white dark:bg-zinc-900 p-2 rounded-lg border border-gray-100 dark:border-zinc-800">
                        <strong>Pregunta clave que evaluó:</strong> "{ev.key_question}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">Desglose por evaluadores no disponible.</p>
              )}
            </div>
          )}

          {/* TAB 3: Matriz Requisitos vs CV */}
          {activeTab === 'matrix' && (
            <div className="space-y-2">
              {matrix.length > 0 ? (
                matrix.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                        {item.requirement}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.status === 'cumplido' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Evidencia en CV: {item.cv_evidence || 'No detectada explícitamente'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">Matriz detallada no generada.</p>
              )}
            </div>
          )}

          {/* TAB 4: Potencial */}
          {activeTab === 'potential' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Compatibilidad Potencial tras Aprendizaje
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Cerrando las brechas con los módulos de Aprender
                  </p>
                </div>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {potential?.potential_score || evaluation.potential_fit_score || evaluation.overall_score}%
                </span>
              </div>
              {potential?.reasoning && (
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {potential.reasoning}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300 transition"
          >
            Cerrar evaluación
          </button>
        </div>
      </div>
    </div>
  );
};
