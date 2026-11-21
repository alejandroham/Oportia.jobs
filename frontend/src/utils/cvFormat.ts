import type { EducationItem, WorkExperience } from '../types';
import { normalizeText } from './searchText';

/** Formato ATS compartido entre el CV base y el adaptado (igual que backend/app/agents/cv_builder.py). */

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const KEYS: Record<string, number> = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };
const CURRENT = /\b(actual|actualidad|presente|present|current|a la fecha|hoy|vigente)\b/i;

/** Quita guiones blandos (U+00AD) y espacios de ancho cero; el guion U+2010 pasa a guion normal. */
export const cleanText = (t: string) => (t || '').replace(/[\u00AD\u200B]/g, '').replace(/\u2010/g, '-');

function parseDate(text: string): [number, number] | null {
  const t = normalizeText(text || '');
  let m = /\b(\d{1,2})\s*[/.-]\s*((?:19|20)\d{2})\b/.exec(t);
  if (m) return [Number(m[2]), Number(m[1]) >= 1 && Number(m[1]) <= 12 ? Number(m[1]) : 0];
  m = /\b((?:19|20)\d{2})\s*[/.-]\s*(\d{1,2})\b/.exec(t);
  if (m) return [Number(m[1]), Number(m[2]) >= 1 && Number(m[2]) <= 12 ? Number(m[2]) : 0];
  m = /\b([a-z]{3})[a-z]*\.?\s*(?:de(?:l)?\s+)?((?:19|20)\d{2})\b/.exec(t);
  if (m && KEYS[m[1]]) return [Number(m[2]), KEYS[m[1]]];
  m = /\b((?:19|20)\d{2})\b/.exec(t);
  return m ? [Number(m[1]), 0] : null;
}

const fmt = (d: [number, number] | null) => (d ? (d[1] ? `${MONTHS[d[1] - 1]} ${d[0]}` : String(d[0])) : '');

export function formatPeriod(exp: Pick<WorkExperience, 'start_date' | 'end_date'>): string {
  let start = (exp.start_date || '').trim();
  let end = (exp.end_date || '').trim();
  if (!end) {
    const parts = start.split(/\s+[–-]\s+|\s+a\s+|\s+al\s+/);
    if (parts.length === 2) [start, end] = parts;
  }
  const s = fmt(parseDate(start)) || start;
  const e = CURRENT.test(end) ? 'Actual' : fmt(parseDate(end)) || end;
  return [s, e].filter(Boolean).join(' – ');
}

/** "Título – Institución (año)", sin repetir carrera y título. */
export function formatEducation(ed: EducationItem): string {
  const degree = (ed.degree || '').trim();
  const field = (ed.field_of_study || '').trim();
  const nd = normalizeText(degree);
  const nf = normalizeText(field);
  const title = !field || (nf && nd.includes(nf)) ? degree || field : !degree || (nd && nf.includes(nd)) ? field : `${degree} en ${field}`;
  return [title, (ed.institution || '').trim()].filter(Boolean).join(' – ') + (ed.graduation_year ? ` (${ed.graduation_year.trim()})` : '');
}
