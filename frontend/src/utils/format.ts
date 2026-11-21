/** 1.6.12 (DT-35): textos compartidos para que toda la app diga lo mismo. */

// Reloj de 24 horas: "es-CL" a veces da "09:05 p. m." según el navegador.
const CHAT_TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };

/** "1 oferta disponible" / "8 ofertas disponibles" (antes "1 ofertas disponibles"). */
export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('es-CL')} ${n === 1 ? one : many}`;
}

/**
 * Hora de un mensaje del chat en formato chileno ("14:05"). Los mensajes antiguos guardaron la hora en
 * formatos distintos según el navegador ("9:05 PM") o como fecha ISO ("2026-11-20T21:05:00.000Z").
 */
export function formatChatTime(value?: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString('es-CL', CHAT_TIME);
  }
  const m = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?\s*m\.?$/i);
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase() === 'p') h += 12;
    return `${String(h).padStart(2, '0')}:${m[2]}`;
  }
  return value;
}

export const nowChatTime = (): string => new Date().toLocaleTimeString('es-CL', CHAT_TIME);

/** Formatos de CV aceptados: los mismos en la guía de inicio y en Mi perfil (antes Mi perfil no aceptaba .txt). */
export const CV_ACCEPT = '.pdf,.docx,.doc,.txt';
export const CV_FORMATS_LABEL = 'PDF, Word (.docx) o TXT · máximo 4 MB';
