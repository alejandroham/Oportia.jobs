/**
 * Cuándo invitar a opinar SIN interrumpir (v1.4.2):
 * - Tarjeta pequeña en una esquina (no una ventana) tras 4 a 8 minutos de uso real (pestaña visible).
 *   Antes era una ventana a los 30-60 minutos y casi nadie llegaba a verla.
 * - Si se cierra con ×, vuelve a aparecer tras 45 minutos más de uso, como máximo 2 veces.
 * - Si la persona ya opinó (tarjeta o formulario), no se vuelve a mostrar.
 * - 👍/👎 en la página: una sola vez por momento (búsqueda, compatibilidad, CV adaptado).
 * Todo vive en el navegador (localStorage); no se envía a ningún servidor.
 */
export const USAGE_KEY = 'oportia_usage_minutes';
export const PROMPT_KEY = 'oportia_feedback_card';
export const QUICK_KEY = 'oportia_quick_feedback';
export const SNOOZE_MINUTES = 45;
export const MAX_ASKS = 2;
export const FIRST_MIN = 4;
export const FIRST_SPREAD = 5; // 4 a 8 minutos

export interface PromptState {
  nextAt: number; // minutos de uso en que corresponde preguntar
  asked: number;
  done: boolean;
}

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function getUsageMinutes(): number {
  return Number(localStorage.getItem(USAGE_KEY) || 0) || 0;
}

export function addUsageMinute(): number {
  const next = getUsageMinutes() + 1;
  localStorage.setItem(USAGE_KEY, String(next));
  return next;
}

export function getPromptState(random: () => number = Math.random): PromptState {
  const s = read<PromptState | null>(PROMPT_KEY, null);
  if (s) return s;
  const fresh = { nextAt: FIRST_MIN + Math.floor(random() * FIRST_SPREAD), asked: 0, done: false };
  localStorage.setItem(PROMPT_KEY, JSON.stringify(fresh));
  return fresh;
}

export function shouldPrompt(minutes = getUsageMinutes(), s = getPromptState()): boolean {
  return !s.done && s.asked < MAX_ASKS && minutes >= s.nextAt;
}

/** Se cerró la tarjeta sin opinar: no repetir hasta 45 min más de uso. */
export function markPrompted(minutes = getUsageMinutes()) {
  const s = getPromptState();
  localStorage.setItem(PROMPT_KEY, JSON.stringify({ ...s, asked: s.asked + 1, nextAt: minutes + SNOOZE_MINUTES }));
}

/** La persona envió su opinión: no volver a preguntar. */
export function markFeedbackDone() {
  localStorage.setItem(PROMPT_KEY, JSON.stringify({ ...getPromptState(), done: true }));
}

/** ¿Ya se respondió (o se descartó) el 👍/👎 de este momento? */
export function quickFeedbackDone(moment: string): boolean {
  return Boolean(read<Record<string, number>>(QUICK_KEY, {})[moment]);
}

export function markQuickFeedback(moment: string) {
  const all = read<Record<string, number>>(QUICK_KEY, {});
  localStorage.setItem(QUICK_KEY, JSON.stringify({ ...all, [moment]: Date.now() }));
}
