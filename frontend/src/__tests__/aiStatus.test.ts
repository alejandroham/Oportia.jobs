import { describe, it, expect } from 'vitest';
import { getAIStatus } from '../utils/aiStatus';
import type { LLMSettings } from '../types';

const base = {
  provider: 'gemini',
  has_active_key: false,
  active_model_name: '',
  status_label: '',
  status_color: 'yellow',
  has_gemini_key: false,
  has_openai_key: false,
  has_claude_key: false,
  gemini_model: '',
  openai_model: '',
  claude_model: ''
} as LLMSettings;

const shared = (extra: object) => ({ available: true, provider: 'gemini' as const, daily_limit: 15, remaining: 12, ...extra });

describe('getAIStatus', () => {
  it('con clave en el servidor pero sin aceptar el aviso: "IA gratuita disponible", no "sin IA"', () => {
    const s = getAIStatus({ ...base, shared_ai: shared({ consented: false, active: false }) });
    expect(s.kind).toBe('shared_available');
    expect(s.title).toBe('IA gratuita disponible');
    expect(s.short).toBe('Activar IA');
  });

  it('IA gratuita activa muestra el cupo restante', () => {
    const s = getAIStatus({ ...base, has_active_key: true, shared_ai: shared({ consented: true, active: true }) });
    expect(s.kind).toBe('shared_active');
    expect(s.detail).toContain('12 de 15');
    expect(s.ready).toBe(true);
  });

  it('la clave propia tiene prioridad', () => {
    const s = getAIStatus({ ...base, has_own_key: true, has_active_key: true, shared_ai: shared({ active: false }) });
    expect(s.kind).toBe('own_key');
    expect(s.title).toBe('Tu clave de Gemini');
  });

  it('sin IA en el servidor ni clave propia', () => {
    expect(getAIStatus({ ...base, shared_ai: shared({ available: false }) }).kind).toBe('none');
    expect(getAIStatus(null).kind).toBe('none');
  });
});
