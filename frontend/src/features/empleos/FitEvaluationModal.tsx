import React, { useState } from 'react';
import type { FitEvaluation, JobPosting } from '../../types';
import { Award, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Tabs } from '../../components/ui/Tabs';
import type { TabItem } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';

interface FitEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: FitEvaluation | null;
  job?: JobPosting | null;
}

export const FitEvaluationModal: React.FC<FitEvaluationModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  job
}) => {
  const [activeTab, setActiveTab] = useState<'director' | 'evaluators' | 'matrix' | 'potential'>('director');

  if (!evaluation) return null;

  const evaluators = evaluation.committee_evaluations || [];
  const matrix = evaluation.requirements_matrix || [];
  const director = evaluation.director_synthesis;
  const potential = evaluation.potential_projection;

  const tabItems: TabItem[] = [
    { id: 'director', label: 'Dictamen del Director' },
    { id: 'evaluators', label: '5 Evaluadores' },
    { id: 'matrix', label: `Requisitos vs CV (${matrix.length})` },
    { id: 'potential', label: 'Proyección Potencial' }
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-brand">{evaluation.overall_score}%</span>
          <span className="text-base font-bold text-ink dark:text-white">
            Evaluación de Compatibilidad (5 Perspectivas)
          </span>
        </div>
      }
      description={job ? `${job.title} en ${job.company}` : undefined}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <Tabs
          items={tabItems}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          variant="segmented"
        />

        {/* Content Area */}
        <div className="max-h-[58vh] overflow-y-auto space-y-4 pr-1">
          {activeTab === 'director' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-800/40 space-y-2">
                <span className="text-xs uppercase font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-brand" />
                  Síntesis del Director de Empleabilidad
                </span>
                <p className="text-xs text-ink dark:text-gray-200 leading-relaxed font-medium">
                  {director?.summary || evaluation.recommendation_summary}
                </p>
                {director?.final_recommendation && (
                  <p className="text-xs text-brand-800 dark:text-brand-200 font-semibold pt-1">
                    Recomendación final: {director.final_recommendation}
                  </p>
                )}
              </div>

              {evaluation.strengths && evaluation.strengths.length > 0 && (
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/60 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Fortalezas clave del postulante
                  </h4>
                  <ul className="text-xs text-ink-muted dark:text-gray-300 space-y-1 list-disc pl-5">
                    {evaluation.strengths.map((str, idx) => (
                      <li key={idx}>{str}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.missing_skills && evaluation.missing_skills.length > 0 && (
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/60 space-y-2">
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Habilidades faltantes o por desarrollar
                  </h4>
                  <ul className="text-xs text-ink-muted dark:text-gray-300 space-y-1 list-disc pl-5">
                    {evaluation.missing_skills.map((skill, idx) => (
                      <li key={idx}>{skill}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'evaluators' && (
            <div className="space-y-3">
              {evaluators.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200/80 dark:border-zinc-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-ink dark:text-white">
                        {ev.role_name}
                      </h4>
                      <span className="text-[12px] text-ink-muted block">Peso: {ev.weight_percentage}%</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white dark:bg-zinc-700 text-ink dark:text-white shadow-2xs border border-gray-200 dark:border-zinc-600">
                      {ev.score}%
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted dark:text-gray-300 leading-relaxed">
                    {ev.justification}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="space-y-2">
              {matrix.map((req, idx) => {
                const isMet = req.status === 'cumplido';
                const isCritical = req.importance === 'excluyente';
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200/80 dark:border-zinc-700/60 flex items-start gap-3"
                  >
                    {isMet ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : isCritical ? (
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink dark:text-white">
                          {req.requirement}
                        </span>
                        {isCritical && (
                          <span className="px-1.5 py-0.5 rounded text-[12px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                            Excluyente
                          </span>
                        )}
                      </div>
                      {req.cv_evidence && (
                        <p className="text-xs text-ink-muted dark:text-gray-400">
                          {req.cv_evidence}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'potential' && (
            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 space-y-2">
              <span className="text-xs uppercase font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Proyección Potencial y Crecimiento
              </span>
              {potential?.potential_score && (
                <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  Potencial: {potential.potential_score}% (Delta: +{potential.score_delta}%)
                </div>
              )}
              {potential?.reasoning && (
                <p className="text-xs text-ink-muted dark:text-gray-300 leading-relaxed">
                  {potential.reasoning}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-ink-border">
          <Button variant="outline" size="md" onClick={onClose}>
            Cerrar evaluación
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
