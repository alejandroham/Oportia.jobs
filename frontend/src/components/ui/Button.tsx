import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-[#20A88A] hover:bg-[#18856D] text-white shadow-xs focus-visible:ring-[#20A88A]/50',
    secondary:
      'bg-teal-50 dark:bg-teal-950/40 text-[#20A88A] dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/50 hover:bg-teal-100 dark:hover:bg-teal-900/40 focus-visible:ring-[#20A88A]/30',
    outline:
      'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 focus-visible:ring-gray-400',
    ghost:
      'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white focus-visible:ring-gray-300',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:ring-rose-500/50'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px] gap-1.5',
    md: 'px-4 py-2 text-xs font-semibold min-h-[42px] gap-2',
    lg: 'px-5 py-2.5 text-sm font-bold min-h-[44px] gap-2.5'
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium rounded-xl transition-all select-none cursor-pointer active:scale-98 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
