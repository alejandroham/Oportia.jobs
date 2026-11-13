import React from 'react';
import { Sparkles } from 'lucide-react';

interface FitScoreBadgeProps {
  score?: number | null;
  potentialScore?: number | null;
  showPotential?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const FitScoreBadge: React.FC<FitScoreBadgeProps> = ({
  score,
  potentialScore,
  showPotential = false,
  size = 'md',
  onClick,
  className = ''
}) => {
  if (score === null || score === undefined) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 ${
          size === 'sm' ? 'px-2 py-0.5 text-[12px]' : size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
        } ${className}`}
      >
        <span>Sin evaluar</span>
      </span>
    );
  }

  const isHigh = score >= 80;
  const isMedium = score >= 70 && score < 80;

  const colorStyles = isHigh
    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
    : isMedium
    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'
    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';

  const dotColor = isHigh ? 'bg-emerald-500' : isMedium ? 'bg-sky-500' : 'bg-amber-500';
  const label = isHigh ? 'Alta' : isMedium ? 'Media' : 'Básica';

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[12px] gap-1'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-sm gap-2 font-semibold'
      : 'px-2.5 py-1 text-xs gap-1.5 font-medium';

  const delta = potentialScore && potentialScore > score ? potentialScore - score : 0;

  const content = (
    <span
      className={`inline-flex items-center rounded-full border transition-all ${colorStyles} ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:shadow-sm hover:opacity-95' : ''
      } ${className}`}
      title={`Compatibilidad estimada: ${score}% (${label})${delta > 0 ? ` · Potencial: ${potentialScore}%` : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{score}% · {label}</span>
      {showPotential && delta > 0 && (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-white/70 dark:bg-zinc-900/70 px-1 rounded-full border border-emerald-200/50">
          <Sparkles className="w-2.5 h-2.5" />
          +{delta}%
        </span>
      )}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="focus:outline-none focus:ring-2 focus:ring-[#20A88A]/40 rounded-full"
      >
        {content}
      </button>
    );
  }

  return content;
};
