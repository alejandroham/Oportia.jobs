import React from 'react';
import type { FitEvaluation } from '../../types';
import { FitScoreBadge } from './FitScoreBadge';
import { CheckCircle2, AlertCircle, Sparkles, ChevronRight, Info } from 'lucide-react';

interface FitEvaluationSummaryProps {
  evaluation: FitEvaluation;
  onOpenFullModal?: () => void;
  className?: string;
}

export const FitEvaluationSummary: React.FC<FitEvaluationSummaryProps> = ({
  evaluation,
  onOpenFullModal,
  className = ''
}) => {
  const strengths = evaluation.strengths?.slice(0, 3) || [];
  const missingSkills = evaluation.missing_skills?.slice(0, 3) || [];
  const directorSummary = evaluation.director_synthesis?.summary || evaluation.recommendation_summary;

  return (
    <div className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-4 ${className}`}>
      {/* Header con puntuación y veredicto */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <FitScoreBadge
            score={evaluation.overall_score}
            potentialScore={evaluation.potential_fit_score}
            showPotential={true}
            size="md"
          />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {evaluation.verdict}
          </span>
        </div>

        {evaluation.potential_fit_score && evaluation.potential_fit_score > evaluation.overall_score && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Potencial: {evaluation.potential_fit_score}%</span>
          </div>
        )}
      </div>

      {/* Dictamen resumido */}
      {directorSummary && (
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          {directorSummary}
        </p>
      )}

      {/* Fortalezas y Brechas en 2 columnas compactas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Fortalezas */}
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Fortalezas ({strengths.length})
          </p>
          {strengths.length > 0 ? (
            <ul className="space-y-1">
              {strengths.map((s, idx) => (
                <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span className="line-clamp-2">{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">Sin fortalezas destacadas</p>
          )}
        </div>

        {/* Brechas */}
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            Brechas a reforzar ({missingSkills.length})
          </p>
          {missingSkills.length > 0 ? (
            <ul className="space-y-1">
              {missingSkills.map((m, idx) => (
                <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="line-clamp-2">{m}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ¡Cumples todos los requisitos clave!
            </p>
          )}
        </div>
      </div>

      {/* Nota de transparencia y CTA a evaluación completa */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
        <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Orientación estimada con IA, no es una decisión final
        </span>

        {onOpenFullModal && (
          <button
            type="button"
            onClick={onOpenFullModal}
            className="text-xs font-semibold text-[#20A88A] hover:text-[#18856d] inline-flex items-center gap-1 focus:outline-none"
          >
            <span>Ver evaluación completa (5 perspectivas)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
