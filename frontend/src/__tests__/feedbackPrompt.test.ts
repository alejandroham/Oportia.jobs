import { beforeEach, describe, expect, it } from 'vitest';
import {
  getPromptState,
  markFeedbackDone,
  markPrompted,
  markQuickFeedback,
  quickFeedbackDone,
  shouldPrompt,
  MAX_ASKS,
  PROMPT_KEY,
  QUICK_KEY,
  USAGE_KEY
} from '../utils/feedbackPrompt';

describe('Tarjeta de opinión (no invasiva) tras 4 a 8 minutos de uso', () => {
  beforeEach(() => {
    localStorage.removeItem(PROMPT_KEY);
    localStorage.removeItem(USAGE_KEY);
    localStorage.removeItem(QUICK_KEY);
  });

  it('elige un umbral entre 4 y 8 minutos, una sola vez', () => {
    expect(getPromptState(() => 0).nextAt).toBe(4);
    expect(getPromptState(() => 0.99).nextAt).toBe(4); // ya quedó guardado
    localStorage.removeItem(PROMPT_KEY);
    expect(getPromptState(() => 0.999).nextAt).toBe(8);
  });

  it('aparece al llegar al umbral y, si se cierra, 45 minutos después', () => {
    getPromptState(() => 0);
    expect(shouldPrompt(3)).toBe(false);
    expect(shouldPrompt(4)).toBe(true);
    markPrompted(4);
    expect(shouldPrompt(30)).toBe(false);
    expect(shouldPrompt(49)).toBe(true);
  });

  it('se muestra como máximo 2 veces y nunca más después de opinar', () => {
    getPromptState(() => 0);
    for (let i = 0; i < MAX_ASKS; i++) markPrompted(4 + i * 45);
    expect(shouldPrompt(10_000)).toBe(false);
    localStorage.removeItem(PROMPT_KEY);
    getPromptState(() => 0);
    markFeedbackDone();
    expect(shouldPrompt(10_000)).toBe(false);
  });

  it('el 👍/👎 se pregunta una sola vez por momento', () => {
    expect(quickFeedbackDone('busqueda')).toBe(false);
    markQuickFeedback('busqueda');
    expect(quickFeedbackDone('busqueda')).toBe(true);
    expect(quickFeedbackDone('cv_adaptado')).toBe(false);
  });
});
