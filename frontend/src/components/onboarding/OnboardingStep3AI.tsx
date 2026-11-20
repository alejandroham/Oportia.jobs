import React, { useState } from 'react';
import { Cpu, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { SharedAICard } from '../settings/SharedAICard';

export interface OnboardingStep3AIProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  provider: 'gemini' | 'openai' | 'claude';
  setProvider: (p: 'gemini' | 'openai' | 'claude') => void;
}

export const OnboardingStep3AI: React.FC<OnboardingStep3AIProps> = ({
  apiKey,
  setApiKey,
  provider,
  setProvider
}) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-4 animate-fade-in text-xs">
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Conecta la IA (opcional)
          </h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-ink-200 leading-relaxed">
          Actívala antes de subir tu CV: la IA es la que lo lee bien y separa tu experiencia laboral, tus títulos y tus
          cursos. También adapta tu CV y tu carta a cada vacante, calcula tu compatibilidad y te prepara para la entrevista.
          Puedes usar la IA gratuita de Oportia o tu propia clave. Tu clave se guarda en este navegador y solo viaja cuando usas la IA. No la uses en equipos compartidos.
        </p>
      </div>

      <SharedAICard />

      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 pt-1">O usa tu propia clave (sin límite diario)</p>

      <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
            Clave de Google Gemini (Recomendado)
          </span>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
          >
            Obtener clave gratuita
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Pega aquí tu clave de API (ej. AIzaSy...)"
            className="w-full text-xs p-2.5 pr-10 rounded-xl bg-white dark:bg-ink-raised border border-black/10 dark:border-white/10 font-mono text-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-ink-200">
          Si no quieres usar IA ahora, puedes continuar y activarla más tarde desde Ajustes.
        </p>
      </div>
    </div>
  );
};
