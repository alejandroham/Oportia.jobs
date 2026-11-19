import { AI_CONSENT_STATEMENTS, AI_NOTICE_VERSION, type ConsentRecord } from '../legal/aiNotice';

/** Registro local (solo en este navegador) de los avisos aceptados, para volver a descargar el comprobante. */
const KEY = 'oportia_consent_log';

const newCode = () => {
  const bytes = new Uint8Array(4);
  (globalThis.crypto || ({} as Crypto)).getRandomValues?.(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase() || String(Date.now()).slice(-8);
};

export function listConsents(): ConsentRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as ConsentRecord[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function recordAIConsent(now = new Date()): ConsentRecord {
  const record: ConsentRecord = {
    type: 'ia_gratuita',
    version: AI_NOTICE_VERSION,
    accepted_at: now.toISOString(),
    code: newCode(),
    statements: [...AI_CONSENT_STATEMENTS]
  };
  localStorage.setItem(KEY, JSON.stringify([record, ...listConsents()].slice(0, 20)));
  return record;
}

/** Último comprobante de la versión vigente del aviso (si existe). */
export function currentAIConsent(): ConsentRecord | null {
  return listConsents().find((r) => r.type === 'ia_gratuita' && r.version === AI_NOTICE_VERSION) || null;
}
