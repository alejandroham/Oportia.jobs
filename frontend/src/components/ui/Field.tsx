import React from 'react';

export interface FieldProps {
  id?: string;
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  id,
  label,
  required = false,
  hint,
  error,
  children,
  className = ''
}) => {
  const hintId = id ? `${id}-hint` : undefined;
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-ink dark:text-gray-200"
        >
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-ink-muted dark:text-gray-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
