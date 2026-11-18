import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';
import { api } from '../../api';
import { useFeedbackStore } from '../../state/useFeedbackStore';
import { markFeedbackDone } from '../../utils/feedbackPrompt';
import { SPONSOR_URL } from './FeedbackDialog';

const FACES = [
  { rating: 1, emoji: '😞', label: 'No me sirvió' },
  { rating: 2, emoji: '😕', label: 'Poco útil' },
  { rating: 3, emoji: '🙂', label: 'Útil' },
  { rating: 4, emoji: '😀', label: 'Muy útil' },
  { rating: 5, emoji: '🤩', label: '¡Me encanta!' }
];

interface FeedbackCardProps {
  onClose: () => void;
}

/**
 * Tarjeta pequeña en la esquina (no tapa la pantalla ni bloquea nada): "¿Cómo va tu experiencia?"
 * con 5 caras. Un toque basta; escribir más es opcional. Se cierra con ×.
 */
export const FeedbackCard: React.FC<FeedbackCardProps> = ({ onClose }) => {
  const [rating, setRating] = useState(0);

  const send = (r: number) => {
    setRating(r);
    markFeedbackDone();
    api.sendOpinion({ rating: r, contact_consent: false, trigger: 'tarjeta', moment: 'tarjeta' }).catch(() => undefined);
  };

  return (
    <aside
      aria-label="Tu opinión sobre Oportia"
      className="no-print fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-40 w-[min(20rem,calc(100vw-6.5rem))] p-3.5 rounded-2xl bg-white dark:bg-ink-surface border border-gray-200 dark:border-ink-line shadow-xl text-xs"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-2 right-2 p-1.5 rounded-md text-ink-muted hover:text-ink dark:hover:text-white cursor-pointer"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      {rating === 0 ? (
        <>
          <p className="pr-6 font-semibold text-ink dark:text-white">¿Cómo va tu experiencia con Oportia?</p>
          <p className="text-ink-muted dark:text-ink-200 mt-0.5">Un toque, anónimo.</p>
          <div className="mt-2.5 flex justify-between gap-1" role="group" aria-label="Califica Oportia">
            {FACES.map((f) => (
              <button
                key={f.rating}
                type="button"
                onClick={() => send(f.rating)}
                aria-label={f.label}
                title={f.label}
                className="flex-1 min-h-[40px] rounded-xl text-xl hover:bg-gray-100 dark:hover:bg-ink-raised cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
              >
                {f.emoji}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div role="status" className="pr-6 space-y-2">
          <p className="font-semibold text-ink dark:text-white">¡Gracias por tu opinión!</p>
          <p className="text-ink-muted dark:text-ink-200">
            <button
              type="button"
              className="underline font-semibold text-ink dark:text-gray-200 cursor-pointer"
              onClick={() => {
                onClose();
                useFeedbackStore.getState().open('manual', 'tarjeta', rating);
              }}
            >
              {rating <= 2 ? 'Cuéntanos qué faltó' : 'Cuéntanos más'}
            </button>{' '}
            (opcional)
          </p>
          {rating >= 4 && (
            <a
              href={SPONSOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 font-semibold"
            >
              <Heart className="w-3.5 h-3.5" aria-hidden="true" /> Apoyar a Oportia
            </a>
          )}
        </div>
      )}
    </aside>
  );
};
