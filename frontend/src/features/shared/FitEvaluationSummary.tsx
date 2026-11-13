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
    <div className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-xs space-y-4 ${className}`}>
      {/* Header con puntuación y veredicto */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <FitScoreBadge
            score={evaluation.overall_score}
            potentialScore={evaluation.potential_fit_score}
            showPotential={true}
            size="md"
          />
          <span className="text-xs font-semibold text-ink dark:text-gray-300">
            {evaluation.verdict}
          </span>
        </div>

        {evaluation.potential_fit_score && evaluation.potential_fit_score > evaluation.overall_score && (
          <div className="flex items-center gap-1.5 text-xs text-brand font-medium bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 rounded-full border border-brand-200/60 dark:border-brand-800/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Potencial: {evaluation.potential_fit_score}%</span>
          </div>
        )}
      </div>

      {/* Dictamen resumido */}
      {directorSummary && (
        <p className="text-xs text-ink-muted dark:text-gray-300 leading-relaxed">
          {directorSummary}
        </p>
      )}

      {/* Fortalezas y Brechas en 2 columnas compactas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Fortalezas */}
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-ink-muted dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Fortalezas en tu perfil ({strengths.length})
          </p>
          {strengths.length > 0 ? (
            <ul className="space-y-1">
              {strengths.map((s, idx) => (
                <li key={idx} className="text-xs text-ink dark:text-gray-300 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                  <span className="line-clamp-2">{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted italic">Sin fortalezas destacadas</p>
          )}
        </div>

        {/* Brechas */}
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-ink-muted dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            Brechas a reforzar ({missingSkills.length})
          </p>
          {missingSkills.length > 0 ? (
            <ul className="space-y-1">
              {missingSkills.map((m, idx) => (
                <li key={idx} className="text-xs text-ink dark:text-gray-300 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                  <span className="line-clamp-2">{m}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-brand font-medium">
              ¡Cumples todos los requisitos clave identificados!
            </p>
          )}
        </div>
      </div>

      {/* Nota de transparencia y CTA a evaluación completa */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
        <span className="text-xs text-ink-muted dark:text-gray-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-brand shrink-0" />
          <span><strong>Es una orientación, no una decisión:</strong> estimación con IA para preparar tu postulación.</span>
        </span>

        {onOpenFullModal && (
          <button
            type="button"
            onClick={onOpenFullModal}
            className="text-xs font-semibold text-brand hover:text-brand-600 inline-flex items-center gap-1 focus:outline-none min-h-[36px]"
          >
            <span>Ver evaluación completa (5 perspectivas)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
