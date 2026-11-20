import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../components/Toast';
import { InterviewSimulator, starScore } from '../features/shared/InterviewSimulator';
import { isAIBusyError, ApiError } from '../api';

/** 1.6.1 (DT-01): el simulador nunca muestra un puntaje que la IA no entregó (antes, 85 % de relleno). */

const ANSWER = 'Lideré la migración del sistema de turnos y reduje los tiempos de espera en un 20 %.';

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })));
}

async function evaluate() {
  render(
    <ToastProvider>
      <InterviewSimulator />
    </ToastProvider>
  );
  fireEvent.change(screen.getByRole('textbox'), { target: { value: ANSWER } });
  fireEvent.click(screen.getByRole('button', { name: /evaluar mi respuesta/i }));
}

describe('Puntaje STAR del simulador de entrevista', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starScore solo acepta números reales', () => {
    expect(starScore({ score: 62 })).toBe(62);
    expect(starScore({ star_score: '71' })).toBe(71);
    expect(starScore({ feedback: 'ok' } as any)).toBeUndefined();
    expect(starScore({ score: 'alto' })).toBeUndefined();
    expect(starScore(null)).toBeUndefined();
  });

  it('con 429 no muestra porcentaje ni "evaluada", y ofrece Reintentar', async () => {
    mockFetch(429, { detail: { error: 'ai_resting', message: 'descansando' } });
    await evaluate();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/evaluada/i)).not.toBeInTheDocument();
  });

  it('con 200 sin puntaje muestra "Sin evaluar"', async () => {
    mockFetch(200, { feedback: 'Buena estructura.' });
    await evaluate();
    expect(await screen.findByText('Sin evaluar')).toBeInTheDocument();
    expect(screen.queryByText('85%')).not.toBeInTheDocument();
  });

  it('con 200 y score 62 muestra 62 %', async () => {
    mockFetch(200, { score: 62, feedback: 'Buena estructura.' });
    await evaluate();
    expect(await screen.findByText('62%')).toBeInTheDocument();
  });
});

describe('isAIBusyError (DT-03)', () => {
  it('reconoce cupo, demanda y 429', () => {
    expect(isAIBusyError(new ApiError('x', 'ai_resting', 429))).toBe(true);
    expect(isAIBusyError(new ApiError('x', 'ai_busy', 200))).toBe(true);
    expect(isAIBusyError(new ApiError('x', undefined, 429))).toBe(true);
    expect(isAIBusyError(new ApiError('x', 'ai_not_connected', 403))).toBe(false);
    expect(isAIBusyError(null)).toBe(false);
  });
});

describe('Historial de postulaciones (DT-04)', () => {
  it('no afirma que Oportia envió la postulación', async () => {
    const { STATUS_EVENT_TITLES } = await import('../features/postulaciones/ApplicationDetail');
    expect(STATUS_EVENT_TITLES.applied).toBe('Marcaste esta postulación como enviada');
    expect(Object.values(STATUS_EVENT_TITLES).join(' ')).not.toMatch(/formalmente/i);
  });
});
