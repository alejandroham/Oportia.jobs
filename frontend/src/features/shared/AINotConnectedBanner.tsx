import React from 'react';
import { Sparkles, Key, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface AINotConnectedBannerProps {
  title?: string;
  description?: string;
  actionText?: string;
  onConnect?: () => void;
  className?: string;
  compact?: boolean;
}

export const AINotConnectedBanner: React.FC<AINotConnectedBannerProps> = ({
  title = 'Conecta la IA para obtener esta función',
  description = 'Configura tu clave de API de Gemini, OpenAI o Claude en Ajustes para activar la evaluación y asistencia con IA.',
  actionText = 'Conectar IA',
  onConnect,
  className = '',
  compact = false
}) => {
  const handleConnectClick = () => {
    if (onConnect) {
      onConnect();
    } else {
      // Trigger opening settings or navigate
      window.location.hash = '#ajustes';
      window.dispatchEvent(new CustomEvent('open-settings'));
    }
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Key className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-900 dark:text-amber-200 font-medium truncate">
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={handleConnectClick}
          className="shrink-0 text-xs font-semibold text-brand hover:text-brand-600 inline-flex items-center gap-1 min-h-[36px] px-2"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-2xl bg-linear-to-br from-brand-50/50 via-surface to-amber-50/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 border border-brand-200/60 dark:border-zinc-700/60 shadow-xs space-y-3 text-left ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1 flex-1">
          <h4 className="text-sm font-bold text-ink dark:text-white">
            {title}
          </h4>
          <p className="text-xs text-ink-muted dark:text-gray-300 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 dark:border-zinc-800">
        <Button
          variant="primary"
          size="sm"
          onClick={handleConnectClick}
          className="inline-flex items-center gap-1.5"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{actionText}</span>
        </Button>
      </div>
    </div>
  );
};
