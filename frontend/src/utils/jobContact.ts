import type { JobPosting } from '../types';
import { getSourceLabel, safeExternalUrl } from './jobSource';

/**
 * Resumen corto de una oferta y cómo contactar o postular, sacado del texto que publicó la fuente.
 * Sin IA y sin inventar: si la oferta no publica un correo, solo se ofrece el enlace oficial.
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Correos de sistema que no sirven para postular.
const IGNORED_EMAIL = /^(no-?reply|noreply|donotreply|mailer-daemon|privacidad|privacy)@|@(example|ejemplo)\.|\.(png|jpe?g|gif|webp)$/i;

export function contactEmails(text: string | undefined | null): string[] {
  const found = (text || '').match(EMAIL_RE) || [];
  const clean = found.map((e) => e.replace(/[.,;:]+$/, '').toLowerCase()).filter((e) => !IGNORED_EMAIL.test(e));
  return Array.from(new Set(clean)).slice(0, 3);
}

/** Primeras frases de la descripción (máx. ~360 caracteres), sin cortar palabras. */
export function shortSummary(description: string | undefined | null, max = 360): string {
  const text = (description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (lastStop > max * 0.5) return cut.slice(0, lastStop + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s]+$/, '') + '…';
}

export interface JobContact {
  emails: string[];
  /** Enlace oficial para postular (si la fuente lo publicó). */
  applyUrl: string | null;
  /** Dónde está publicada: "Empleos Públicos", "LinkedIn", "sitio de la empresa"… */
  sourceLabel: string;
}

export function jobContact(job: Pick<JobPosting, 'description' | 'url' | 'source'>): JobContact {
  return {
    emails: contactEmails(job.description),
    applyUrl: safeExternalUrl(job.url),
    sourceLabel: getSourceLabel(job.source)
  };
}
