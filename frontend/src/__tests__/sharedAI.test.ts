import { describe, it, expect, beforeEach } from 'vitest';
import { deriveAISettings } from '../state/useAppStore';
import { getClientId, hasSharedAIConsent, setSharedAIConsent, reportSharedAIRemaining, onSharedAIRemaining } from '../utils/sharedAI';
import { getLLMHeaders, getHumanErrorMessage, isAINotConnectedError, isAIRestingError } from '../api';
import type { LLMSettings } from '../types';

const base: LLMSettings = {
  provider: 'gemini',
  has_active_key: false,
  active_model_name: 'gemini-2.0-flash',
  status_label: '',
  status_color: 'yellow',
  has_gemini_key: false,
  has_openai_key: false,
  has_claude_key: false,
  gemini_model: 'gemini-2.0-flash',
  openai_model: 'gpt-4o',
  claude_model: 'claude',
  shared_ai: { available: true, provider: 'gemini', daily_limit: 15, remaining: 15 }
};

describe('IA gratuita de Oportia', () => {
  beforeEach(() => localStorage.clear());

  it('sin consentimiento no se activa', () => {
    const s = deriveAISettings(base);
    expect(s.has_active_key).toBe(false);
    expect(s.status_label).toBe('IA no conectada');
    expect(s.shared_ai?.active).toBe(false);
  });

  it('con consentimiento se activa la IA gratuita', () => {
    setSharedAIConsent(true);
    const s = deriveAISettings(base);
    expect(s.has_active_key).toBe(true);
    expect(s.has_own_key).toBe(false);
    expect(s.status_label).toBe('IA gratuita de Oportia');
  });

  it('la clave propia tiene prioridad sobre la IA gratuita', () => {
    setSharedAIConsent(true);
    localStorage.setItem('job_search_llm_key_gemini', 'cifrada');
    const s = deriveAISettings(base);
    expect(s.has_own_key).toBe(true);
    expect(s.shared_ai?.active).toBe(false);
    expect(s.status_label).toContain('tu clave');
  });

  it('sin IA gratuita disponible y sin clave, no hay IA', () => {
    setSharedAIConsent(true);
    const s = deriveAISettings({ ...base, shared_ai: { ...base.shared_ai!, available: false } });
    expect(s.has_active_key).toBe(false);
  });

  it('el ID del navegador es estable y anónimo', () => {
    const a = getClientId();
    expect(a).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(getClientId()).toBe(a);
  });

  it('las cabeceras incluyen el consentimiento solo si se aceptó', async () => {
    let h = await getLLMHeaders();
    expect(h['X-Oportia-Client']).toBeTruthy();
    expect(h['X-Oportia-Shared-AI-Consent']).toBeUndefined();
    setSharedAIConsent(true);
    expect(hasSharedAIConsent()).toBe(true);
    h = await getLLMHeaders();
    expect(h['X-Oportia-Shared-AI-Consent']).toBe('1');
  });

  it('informa el cupo restante desde la cabecera de respuesta', () => {
    const seen: number[] = [];
    const off = onSharedAIRemaining((n) => seen.push(n));
    reportSharedAIRemaining(new Response('{}', { headers: { 'X-Shared-AI-Remaining': '7' } }));
    reportSharedAIRemaining(new Response('{}'));
    off();
    expect(seen).toEqual([7]);
  });

  it('mensaje "descansando" y consentimiento pendiente', () => {
    expect(isAIRestingError({ code: 'ai_resting' })).toBe(true);
    expect(getHumanErrorMessage({ code: 'ai_resting' })).toContain('descansando');
    expect(isAINotConnectedError({ code: 'shared_ai_consent_required' })).toBe(true);
  });
});
