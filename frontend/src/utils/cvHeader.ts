import type { CandidateProfile } from '../types';
import { getProfileLinks } from './profileKeywords';

/**
 * Encabezado del CV adaptado SIEMPRE con los datos actuales de tu perfil (no con lo que escribió la IA):
 * nombre, titular, correo · teléfono · comuna, y enlaces. Así:
 * - el correo y el teléfono aparecen siempre, también en CV adaptados con versiones anteriores;
 * - si corriges un dato en Mi perfil, el CV ya generado lo muestra corregido;
 * - la IA no puede alterar ni inventar datos de contacto.
 * Es el mismo formato que arma el servidor (backend/app/privacy/redact.py: apply_cv_header).
 */
export function profileHeaderLines(profile: CandidateProfile): string[] {
  const title = profile.headline || profile.primary_profession || '';
  const place = [profile.commune, profile.region].filter(Boolean).join(', ') || (profile.location && profile.location !== 'Chile' ? profile.location : '');
  const contact = [profile.email, profile.phone, place].map((x) => (x || '').trim()).filter(Boolean).join(' · ');
  const links = getProfileLinks(profile)
    .map((l) => l.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ');
  return [`# ${profile.name?.trim() || 'Tu nombre'}`, title ? `**${title}**` : '', contact, links].filter(Boolean);
}

export function withProfileHeader(markdown: string, profile: CandidateProfile | null | undefined): string {
  if (!markdown || !profile) return markdown;
  const md = markdown.replace(/\r\n/g, '\n').replace(/\{\{\s*NOMBRE\s*\}\}/gi, profile.name || '');
  const firstSection = md.search(/^##\s/m);
  const body = firstSection >= 0 ? md.slice(firstSection) : md.replace(/^#\s.*\n?/, '');
  return `${profileHeaderLines(profile).join('\n\n')}\n\n${body.trimStart()}`.trim();
}

/** Datos de contacto que faltan en el perfil para que el CV quede completo. */
export function missingContact(profile: CandidateProfile | null | undefined): string[] {
  if (!profile) return [];
  const out: string[] = [];
  if (!profile.email?.trim()) out.push('correo');
  if (!profile.phone?.trim()) out.push('teléfono');
  if (!profile.commune?.trim() && !profile.region?.trim()) out.push('comuna');
  return out;
}
