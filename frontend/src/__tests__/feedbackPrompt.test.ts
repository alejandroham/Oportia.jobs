import { beforeEach, describe, expect, it } from 'vitest';
import { getPromptState, markFeedbackDone, markPrompted, shouldPrompt, MAX_ASKS, PROMPT_KEY, USAGE_KEY } from '../utils/feedbackPrompt';

describe('Invitación a opinar tras 30-60 minutos de uso', () => {
  beforeEach(() => {
    localStorage.removeItem(PROMPT_KEY);
    localStorage.removeItem(USAGE_KEY);
  });

  it('elige un umbral entre 30 y 60 minutos, una sola vez', () => {
    expect(getPromptState(() => 0).nextAt).toBe(30);
    expect(getPromptState(() => 0.99).nextAt).toBe(30); // ya quedó guardado
    localStorage.removeItem(PROMPT_KEY);
    expect(getPromptState(() => 0.999).nextAt).toBe(60);
  });

  it('pregunta al llegar al umbral y, con "Ahora no", 60 minutos después', () => {
    getPromptState(() => 0); // 30 min
    expect(shouldPrompt(29)).toBe(false);
    expect(shouldPrompt(30)).toBe(true);
    markPrompted(30);
    expect(shouldPrompt(60)).toBe(false);
    expect(shouldPrompt(90)).toBe(true);
  });

  it('pregunta como máximo 3 veces y nunca más después de responder', () => {
    getPromptState(() => 0);
    for (let i = 0; i < MAX_ASKS; i++) markPrompted(30 + i * 60);
    expect(shouldPrompt(10_000)).toBe(false);
    localStorage.removeItem(PROMPT_KEY);
    getPromptState(() => 0);
    markFeedbackDone();
    expect(shouldPrompt(10_000)).toBe(false);
  });
});
