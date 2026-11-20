import { describe, it, expect, vi } from 'vitest';
import { getAIStatus, sharedAIBusyMinutes } from '../utils/aiStatus';
import { onSharedAIBusy, reportSharedAIRemaining } from '../utils/sharedAI';
import type { LLMSettings } from '../types';

/** 1.6.5 (DT-17): estado real de la IA gratuita ("con demanda") en el indicador y en las funciones. */
const base = {
  provider: 'gemini', has_active_key: true, active_model_name: '', status_label: '', status_color: 'green',
  has_gemini_key: false, has_openai_key: false, has_claude_key: false, gemini_model: '', openai_model: '', claude_model: ''
} as LLMSettings;
const shared = (extra: object) => ({ available: true, provider: 'gemini' as const, daily_limit: 15, remaining: 12, consented: true, active: true, ...extra });

describe('IA gratuita con demanda', () => {
  it('muestra "IA con demanda" y no está lista mientras dura la espera', () => {
    const s = getAIStatus({ ...base, shared_ai: shared({ state: 'busy', busy_until: Date.now() + 90_000 }) });
    expect(s.busy).toBe(true);
    expect(s.ready).toBe(false);
    expect(s.short).toBe('IA con demanda');
    expect(s.detail).toMatch(/2 minutos/);
  });

  it('cuando termina la espera vuelve a estar lista', () => {
    const s = getAIStatus({ ...base, shared_ai: shared({ state: 'busy', busy_until: Date.now() - 1 }) });
    expect(s.busy).toBeUndefined();
    expect(s.ready).toBe(true);
    expect(sharedAIBusyMinutes({ ...base, shared_ai: shared({ busy_until: Date.now() - 1 }) })).toBe(0);
  });

  it('lee X-Oportia-AI-State y Retry-After de la respuesta del servidor', () => {
    const fn = vi.fn();
    const off = onSharedAIBusy(fn);
    reportSharedAIRemaining(new Response('{}', { status: 429, headers: { 'X-Oportia-AI-State': 'busy', 'Retry-After': '120' } }));
    reportSharedAIRemaining(new Response('{}', { status: 200 }));
    off();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(120);
  });
});
