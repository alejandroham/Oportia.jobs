import type { JobPosting } from '../types';

/**
 * Vencimiento de una oferta (mismas reglas que el índice diario):
 * 1. Fecha de cierre publicada (real).
 * 2. Fecha de publicación + 30 días (estimada).
 * 3. Sin fechas: primera vez que Oportia la vio + 45 días (estimada).
 * Si el índice ya trae `expires_at`, se usa esa (por ejemplo, la de los portales de empresas).
 */
export const DAYS_WITH_POSTED_DATE = 30;
export const DAYS_WITHOUT_DATES = 45;

export interface JobExpiry {
  date: Date;
  estimated: boolean;
  expired: boolean;
  daysLeft: number; // negativo si ya venció
}

const DAY = 24 * 60 * 60 * 1000;

/** Fecha (solo el día) de textos como "2026-11-05T0:00:00", que `new Date` no siempre entiende. */
export function parseDay(value?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((value || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

export function getJobExpiry(job: Pick<JobPosting, 'deadline' | 'posted_at' | 'discovered_at' | 'tracked_at'> & { expires_at?: string | null; expires_estimated?: boolean }, now: Date = new Date()): JobExpiry | null {
  let date: Date | null = null;
  let estimated = true;
  const deadline = parseDay(job.deadline);
  const fromIndex = parseDay(job.expires_at);
  if (deadline) {
    date = deadline;
    estimated = false;
  } else if (fromIndex) {
    date = fromIndex;
    estimated = job.expires_estimated !== false;
  } else {
    const posted = parseDay(job.posted_at);
    const seen = parseDay(job.discovered_at) || parseDay(job.tracked_at);
    if (posted) date = addDays(posted, DAYS_WITH_POSTED_DATE);
    else if (seen) date = addDays(seen, DAYS_WITHOUT_DATES);
  }
  if (!date) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.round((date.getTime() - today.getTime()) / DAY);
  return { date, estimated, expired: daysLeft < 0, daysLeft };
}

export const formatExpiryDate = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

/** Texto para la tarjeta: "Cierra el 20 nov. 2026" / "Vence aprox. el 16 dic. 2026 (estimado)" / "Vencida el …". */
export function expiryLabel(e: JobExpiry): string {
  const when = formatExpiryDate(e.date);
  if (e.expired) return `Vencida el ${when}${e.estimated ? ' (estimado)' : ''}`;
  if (e.daysLeft === 0) return e.estimated ? 'Vence hoy (estimado)' : 'Cierra hoy';
  return e.estimated ? `Vence aprox. el ${when} (estimado)` : `Cierra el ${when}`;
}
