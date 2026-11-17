import { describe, expect, it, vi } from 'vitest';
vi.mock('./supabase', () => ({ supabase: {}, publicFile: (n: string) => n, APP_URL: 'https://x' }));
import { summarize, type DailyStat } from './data';

describe('summarize', () => {
  it('cuenta activos de hoy, promedio de 7 días y totales por tipo', () => {
    const today = new Date('2026-11-17T15:00:00Z');
    const stats: DailyStat[] = [
      { day: '2026-11-17', kind: 'visita', category: 'uso', events: 30, clients: 12 },
      { day: '2026-11-16', kind: 'visita', category: 'uso', events: 20, clients: 8 },
      { day: '2026-11-01', kind: 'visita', category: 'uso', events: 99, clients: 50 },
      { day: '2026-11-17', kind: 'busqueda', category: 'uso', events: 40, clients: 10 },
      { day: '2026-11-16', kind: 'busqueda', category: 'uso', events: 5, clients: 3 }
    ];
    const s = summarize(stats, today);
    expect(s.activeToday).toBe(12);
    expect(s.avgActiveWeek).toBe(10); // (12 + 8) / 2; el 1 de noviembre queda fuera de la semana
    expect(s.totals.busqueda).toBe(45);
    expect(s.days).toEqual(['2026-11-01', '2026-11-16', '2026-11-17']);
  });
});
