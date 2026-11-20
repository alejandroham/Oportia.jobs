/**
 * IA gratuita de Oportia (clave de Gemini del servidor, con cupo diario).
 *
 * - Identificador anónimo del navegador: solo sirve para contar el cupo diario. Es un UUID
 *   aleatorio, no contiene datos personales y el servidor solo guarda un hash en memoria.
 * - Consentimiento: la IA gratuita usa el plan gratuito de la API de Gemini, en el que Google
 *   puede usar el contenido enviado para mejorar sus productos. Sin aceptar el aviso, el
 *   navegador no envía la cabecera de consentimiento y el servidor rechaza el uso.
 */

const CLIENT_ID_KEY = 'oportia_client_id';
const CONSENT_KEY = 'oportia_shared_ai_consent';
/** Cambiar la versión obliga a pedir el consentimiento de nuevo si cambia el aviso. */
export { AI_NOTICE_VERSION as SHARED_AI_NOTICE_VERSION } from '../legal/aiNotice';
import { AI_NOTICE_VERSION as SHARED_AI_NOTICE_VERSION } from '../legal/aiNotice';

const randomId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const getClientId = (): string => {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    id = randomId();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
};

export const hasSharedAIConsent = (): boolean =>
  typeof window !== 'undefined' && !!window.localStorage && localStorage.getItem(CONSENT_KEY) === SHARED_AI_NOTICE_VERSION;

export const setSharedAIConsent = (accepted: boolean): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (accepted) localStorage.setItem(CONSENT_KEY, SHARED_AI_NOTICE_VERSION);
  else localStorage.removeItem(CONSENT_KEY);
};

/** Avisos de cupo restante que el servidor envía en la cabecera X-Shared-AI-Remaining. */
type RemainingListener = (remaining: number) => void;
const listeners = new Set<RemainingListener>();

export const onSharedAIRemaining = (fn: RemainingListener): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** 1.6.5 (DT-17): "con demanda". El servidor lo informa con X-Oportia-AI-State y Retry-After. */
type BusyListener = (retryAfterSeconds: number) => void;
const busyListeners = new Set<BusyListener>();

export const onSharedAIBusy = (fn: BusyListener): (() => void) => {
  busyListeners.add(fn);
  return () => busyListeners.delete(fn);
};

export const reportSharedAIState = (res: Response): void => {
  if (res.headers?.get?.('X-Oportia-AI-State') !== 'busy') return;
  const wait = Number(res.headers.get('Retry-After') || '60');
  busyListeners.forEach((fn) => fn(Number.isFinite(wait) && wait > 0 ? wait : 60));
};

export const reportSharedAIRemaining = (res: Response): void => {
  reportSharedAIState(res);
  const raw = res.headers?.get?.('X-Shared-AI-Remaining');
  if (raw === null || raw === undefined || raw === '') return;
  const n = Number(raw);
  if (Number.isFinite(n)) listeners.forEach((fn) => fn(n));
};
