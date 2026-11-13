import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = ''
}) => {
  return (
    <div
      className={`bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border rounded-2xl p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs animate-fade-in ${className}`}
    >
      <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-xs">
        <Icon className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-ink dark:text-white tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-ink-muted dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {actionLabel && onAction && (
            <Button variant="primary" size="md" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" size="md" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
