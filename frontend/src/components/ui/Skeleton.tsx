import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'circular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
  ...props
}) => {
  const variantStyles = {
    text: 'rounded h-4 w-full',
    circular: 'rounded-full',
    rounded: 'rounded-xl'
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-gray-200/80 dark:bg-zinc-800/80 ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
};
