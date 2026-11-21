import React, { useEffect, useRef, useId } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showCloseButton?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
  showCloseButton = true
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  // DT-29: foco atrapado dentro y de vuelta al cerrar. Ids únicos por si hay dos diálogos abiertos.
  useFocusTrap(dialogRef, isOpen);
  const uid = useId();
  const titleId = `dialog-title-${uid}`;
  const descId = `dialog-description-${uid}`;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`w-full ${maxWidthStyles[maxWidth]} bg-white dark:bg-ink-surface border border-gray-200 dark:border-ink-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in`}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-ink-border">
            <div>
              {title && (
                <h3
                  id={titleId}
                  className="text-base font-bold text-ink dark:text-white"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p
                  id={descId}
                  className="text-xs text-ink-muted dark:text-ink-200 mt-0.5"
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-gray-100 dark:hover:bg-ink-border dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
