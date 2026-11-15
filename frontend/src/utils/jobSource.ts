/** Nombre legible de la fuente de una oferta (se muestra en la tarjeta y en el detalle). */
const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  linkedin_chile: 'LinkedIn Chile',
  computrabajo: 'Computrabajo',
  chiletrabajos: 'ChileTrabajos',
  laborum: 'Laborum',
  empleospublicos: 'Empleos Públicos',
  getonbrd: 'GetOnBoard',
  arbeitnow: 'Arbeitnow',
  remotive: 'Remotive',
  remoteok: 'RemoteOK',
  url_import: 'Enlace importado',
  ats: 'Portal de la empresa',
  demo: 'Demostración'
};

export function getSourceLabel(source?: string | null): string {
  if (!source) return 'Fuente desconocida';
  const key = source.toLowerCase();
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key];
  if (key.startsWith('ats')) return 'Portal de la empresa';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

/** Solo enlaces http(s): evita abrir esquemas peligrosos (javascript:, data:). */
export function safeExternalUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}
