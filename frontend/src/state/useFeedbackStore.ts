import { create } from 'zustand';

type Trigger = 'manual' | 'auto';

interface FeedbackStore {
  isOpen: boolean;
  trigger: Trigger;
  open: (trigger?: Trigger) => void;
  close: () => void;
}

/** Abre el recuadro "¿Qué te parece Oportia?" desde cualquier parte (pie, portada o invitación automática). */
export const useFeedbackStore = create<FeedbackStore>((set) => ({
  isOpen: false,
  trigger: 'manual',
  open: (trigger = 'manual') => set({ isOpen: true, trigger }),
  close: () => set({ isOpen: false })
}));
