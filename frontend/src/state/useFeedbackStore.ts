import { create } from 'zustand';
import type { FeedbackMoment, FeedbackTrigger } from '../api';

interface FeedbackStore {
  isOpen: boolean;
  trigger: FeedbackTrigger;
  moment?: FeedbackMoment;
  /** Calificación ya elegida (por ejemplo, desde 👍/👎 o la tarjeta) para no pedirla de nuevo. */
  initialRating?: number;
  open: (trigger?: FeedbackTrigger, moment?: FeedbackMoment, initialRating?: number) => void;
  close: () => void;
}

/** Abre el recuadro "¿Qué te parece Oportia?" desde cualquier parte (menú, pie, portada, tarjeta o 👍/👎). */
export const useFeedbackStore = create<FeedbackStore>((set) => ({
  isOpen: false,
  trigger: 'manual',
  open: (trigger = 'manual', moment, initialRating) => set({ isOpen: true, trigger, moment, initialRating }),
  close: () => set({ isOpen: false })
}));
