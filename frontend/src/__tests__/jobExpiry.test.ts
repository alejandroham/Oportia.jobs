import { describe, expect, it } from 'vitest';
import { expiryLabel, getJobExpiry } from '../utils/jobExpiry';

const NOW = new Date(2026, 10, 17); // 17 nov 2026

describe('Vencimiento de ofertas (1.3.1)', () => {
  it('usa la fecha de cierre publicada (real)', () => {
    const e = getJobExpiry({ deadline: '2026-11-20T12:00:00', discovered_at: '2026-11-01' }, NOW)!;
    expect(e.estimated).toBe(false);
    expect(e.daysLeft).toBe(3);
    expect(expiryLabel(e)).toMatch(/^Cierra el 20 nov/);
  });

  it('sin cierre: publicación + 30 días (estimado)', () => {
    const e = getJobExpiry({ posted_at: '2026-11-01T10:00:00Z', discovered_at: '2026-11-05' }, NOW)!;
    expect(e.estimated).toBe(true);
    expect(e.daysLeft).toBe(14);
    expect(expiryLabel(e)).toMatch(/^Vence aprox\. el 1 dic.*\(estimado\)$/);
  });

  it('sin ninguna fecha: 45 días desde que Oportia la encontró', () => {
    expect(getJobExpiry({ discovered_at: '2026-10-10T08:00:00' }, NOW)!.daysLeft).toBe(7);
    const old = getJobExpiry({ discovered_at: '2026-09-30' }, NOW)!;
    expect(old.expired).toBe(true);
    expect(expiryLabel(old)).toMatch(/^Vencida el 14 nov.*\(estimado\)$/);
  });

  it('respeta el vencimiento que trae el índice diario', () => {
    const e = getJobExpiry({ posted_at: '2024-09-03', discovered_at: '2026-09-01', expires_at: '2026-11-24', expires_estimated: true }, NOW)!;
    expect(e.expired).toBe(false);
    expect(e.daysLeft).toBe(7);
  });

  it('sin datos no inventa una fecha', () => {
    expect(getJobExpiry({ discovered_at: '' }, NOW)).toBeNull();
  });
});
