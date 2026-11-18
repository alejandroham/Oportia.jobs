import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { api, type FeedbackMoment } from '../../api';
import { useFeedbackStore } from '../../state/useFeedbackStore';
import { quickFeedbackDone, markQuickFeedback } from '../../utils/feedbackPrompt';

interface QuickFeedbackProps {
  moment: FeedbackMoment;
  question: string;
  className?: string;
}

/**
 * "¿Te sirvió? 👍 👎" dentro de la página: un toque, anónimo y una sola vez por momento.
 * No abre ventanas: después del toque ofrece (opcional) contar más en el formulario completo.
 */
export const QuickFeedback: React.FC<QuickFeedbackProps> = ({ moment, question, className = '' }) => {
  const [state, setState] = useState<'ask' | 'thanks' | 'hidden'>(() => (quickFeedbackDone(moment) ? 'hidden' : 'ask'));
  const [vote, setVote] = useState<number>(0);

  if (state === 'hidden') return null;

  const send = (rating: number) => {
    setVote(rating);
    setState('thanks');
    markQuickFeedback(moment);
    // Si falla (sin conexión, tope anti-spam) no se molesta a la persona.
    api.sendOpinion({ rating, contact_consent: false, trigger: 'rapida', moment }).catch(() => undefined);
  };

  const dismiss = () => {
    markQuickFeedback(moment);
    setState('hidden');
  };

  const btn =
    'inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-gray-200 dark:border-ink-line bg-white dark:bg-ink-surface font-semibold text-ink dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-ink-raised cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none';

  return (
    <div
      role="group"
      aria-label="Tu opinión"
      className={`no-print flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-ink-raised/60 border border-gray-200/80 dark:border-ink-line/60 text-xs ${className}`}
    >
      {state === 'ask' ? (
        <>
          <span className="font-medium text-ink dark:text-gray-200">{question}</span>
          <button type="button" className={btn} onClick={() => send(5)} aria-label="Sí, me sirvió">
            <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" /> Sí
          </button>
          <button type="button" className={btn} onClick={() => send(1)} aria-label="No me sirvió">
            <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" /> No
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="No preguntar más"
            title="No preguntar más"
            className="ml-auto p-1.5 rounded-md text-ink-muted hover:text-ink dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </>
      ) : (
        <span role="status" className="text-ink dark:text-gray-200">
          ¡Gracias! {vote <= 2 ? '¿Qué faltó?' : '¿Algo más que quieras contarnos?'}{' '}
          <button
            type="button"
            className="underline font-semibold cursor-pointer"
            onClick={() => {
              setState('hidden');
              useFeedbackStore.getState().open('manual', moment, vote <= 2 ? 2 : 5);
            }}
          >
            Escribir (opcional)
          </button>
        </span>
      )}
    </div>
  );
};
