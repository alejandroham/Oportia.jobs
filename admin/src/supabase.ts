import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') || '';
const KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || '';
export const APP_URL = ((import.meta.env.VITE_APP_URL as string | undefined) || 'https://oportia-jobs.vercel.app').replace(/\/$/, '');
export const configured = Boolean(SUPABASE_URL && KEY);

/** Sesión solo en esta pestaña (sessionStorage): al cerrar el navegador hay que volver a entrar. */
export const supabase = createClient(SUPABASE_URL || 'https://invalid.local', KEY || 'missing', {
  auth: { persistSession: true, storage: window.sessionStorage, autoRefreshToken: true, detectSessionInUrl: false }
});

export const publicFile = (name: string) => `${SUPABASE_URL}/storage/v1/object/public/oportia-index/${name}`;
