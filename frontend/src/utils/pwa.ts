/**
 * Instalación de Oportia como app en el celular (PWA).
 *
 * - Android / Chrome / Edge: el navegador emite `beforeinstallprompt`; se guarda y se usa
 *   desde el botón "Instalar".
 * - iPhone / iPad: Apple no permite instalar desde un botón; se muestran los pasos
 *   (Compartir → Agregar a pantalla de inicio).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform = 'ios' | 'android' | 'desktop';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export const onInstallStateChange = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone);
};

export const detectPlatform = (ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): InstallPlatform => {
  const iPadOS = /Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
};

export const canPromptInstall = (): boolean => deferredPrompt !== null;

/** Abre el aviso nativo de instalación. Devuelve true si la persona aceptó. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const evt = deferredPrompt;
  deferredPrompt = null;
  notify();
  await evt.prompt();
  const choice = await evt.userChoice;
  return choice.outcome === 'accepted';
}

/** Se llama una vez al iniciar la app (main.tsx). */
export function initPWA(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // la app muestra su propio botón
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });

  // Solo en producción: en desarrollo un service worker estorba la recarga en caliente.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('No se pudo registrar el service worker:', err));
    });
  }
}
