/**
 * Cuándo invitar a dar una opinión: tras 30 a 60 minutos de uso real (pestaña visible).
 * - El umbral se elige al azar una sola vez por navegador (entre 30 y 60 min).
 * - "Ahora no": se vuelve a preguntar tras 60 minutos más de uso, máximo 3 veces.
 * - Si la persona ya respondió, no se vuelve a preguntar.
 * Todo vive en el navegador (localStorage); no se envía a ningún servidor.
 */
export const USAGE_KEY = 'oportia_usage_minutes';
export const PROMPT_KEY = 'oportia_feedback_prompt';
export const SNOOZE_MINUTES = 60;
export const MAX_ASKS = 3;

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
  const fresh = { nextAt: 30 + Math.floor(random() * 31), asked: 0, done: false };
  localStorage.setItem(PROMPT_KEY, JSON.stringify(fresh));
  return fresh;
}

export function shouldPrompt(minutes = getUsageMinutes(), s = getPromptState()): boolean {
  return !s.done && s.asked < MAX_ASKS && minutes >= s.nextAt;
}

/** Se mostró la invitación (automática): no repetir hasta 60 min más de uso. */
export function markPrompted(minutes = getUsageMinutes()) {
  const s = getPromptState();
  localStorage.setItem(PROMPT_KEY, JSON.stringify({ ...s, asked: s.asked + 1, nextAt: minutes + SNOOZE_MINUTES }));
}

/** La persona envió su opinión: no volver a preguntar. */
export function markFeedbackDone() {
  localStorage.setItem(PROMPT_KEY, JSON.stringify({ ...getPromptState(), done: true }));
}
