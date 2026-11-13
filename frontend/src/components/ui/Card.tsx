import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'article' | 'section';
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  padding = 'md',
  as: Component = 'div',
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:border-brand-500/40 hover:shadow-md transition-all active:scale-[0.99]'
    : '';

  return (
    <Component
      className={`bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border rounded-2xl shadow-xs transition-colors ${paddingStyles[padding]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};
