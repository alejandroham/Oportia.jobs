/**
 * Oportia Jobs IA — Sovereign Client-Side Storage & Session Manager
 * Uses browser-native IndexedDB for persistent local-first storage.
 * Guarantees zero personal data retention on cloud/remote servers.
 */

import type {
  CandidateProfile,
  UserPreferences,
  JobPosting,
  ApplicationDraft
} from '../types';
import {
  encryptText,
  decryptPackage,
  clearDeviceCryptoSeed,
  type EncryptedPackage
} from './crypto';

// Retain DB_NAME for seamless zero-loss backwards compatibility
const DB_NAME = 'NexusJob_SovereignDB';
const DB_VERSION = 1;
const STORE_NAME = 'client_session';

export interface SessionBackupBundle {
  app: 'Oportia Jobs IA' | 'NexusJob AI';
  format_version: '1.0' | '1.1' | '1.2';
  exported_at: string;
  candidate_name?: string;
  payload: {
    profile: CandidateProfile | null;
    preferences: UserPreferences | null;
    jobs: JobPosting[];
    applications: ApplicationDraft[];
    coach_data?: any;
    /** Conversación con Opi (desde formato 1.2). */
    chat_history?: any[];
  };
}

/** Todo lo que incluye un respaldo. Las claves de IA NO se incluyen a propósito. */
export interface BackupContent {
  profile: CandidateProfile | null;
  preferences: UserPreferences | null;
  jobs: JobPosting[];
  applications: ApplicationDraft[];
  coachData?: any;
  chatHistory?: any[];
}

// ── Native IndexedDB Helper ──────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveClientStore<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn(`[Storage] Fallo al guardar en IndexedDB (${key}), usando localStorage fallback:`, e);
    try {
      localStorage.setItem(`nexusjob_${key}`, JSON.stringify(value));
    } catch {
      // Storage quota or blocked
    }
  }
}

export async function getClientStore<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn(`[Storage] Fallo al leer de IndexedDB (${key}), revisando localStorage:`, e);
    try {
      const fallback = localStorage.getItem(`nexusjob_${key}`);
      return fallback ? JSON.parse(fallback) : null;
    } catch {
      return null;
    }
  }
}

export async function clearClientStore(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[Storage] Error al limpiar IndexedDB:', e);
  }

  // Clear ALL localStorage keys related to Oportia & NexusJob including API keys and encryption seed
  try {
    const keysToRemove = [
      'oportia_profile',
      'oportia_preferences',
      'oportia_jobs',
      'oportia_applications',
      'oportia_radar_pageSize',
      'oportia_chat_history',
      'nexus_chat_history',
      'nexusjob_profile',
      'nexusjob_preferences',
      'nexusjob_jobs',
      'nexusjob_applications',
      'nexusjob_radar_pageSize',
      'job_search_llm_key_gemini',
      'job_search_llm_key_openai',
      'job_search_llm_key_claude',
      'job_search_default_provider',
      'nexusjob_sec_seed_v1',
      'oportia_sec_seed_v1'
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    clearDeviceCryptoSeed();
  } catch {
    // ignore
  }
}

// ── Export / Import Backup Helpers ────────────────────────────────────────

/**
 * Arma el contenido del respaldo (sin cifrar). Separado de la descarga para poder probarlo.
 * Antes se recibían parámetros posicionales y la pantalla los pasaba en otro orden: la contraseña
 * quedaba guardada como "datos de Aprender" y el archivo salía SIN cifrar.
 */
export function buildBackupBundle(content: BackupContent): SessionBackupBundle {
  return {
    app: 'Oportia Jobs IA',
    format_version: '1.2',
    exported_at: new Date().toISOString(),
    candidate_name: content.profile?.name || 'Candidato',
    payload: {
      profile: content.profile,
      preferences: content.preferences, // incluye "qué busco", logros STAR y lo que Opi sabe de ti
      jobs: content.jobs,
      applications: content.applications,
      coach_data: content.coachData ?? undefined,
      chat_history: Array.isArray(content.chatHistory) ? content.chatHistory : undefined
    }
  };
}

/** Texto final del archivo y su nombre. Con contraseña, AES-GCM 256 (sin la contraseña adentro). */
export async function serializeBackup(
  content: BackupContent,
  options: { passphrase?: string; hint?: string } = {}
): Promise<{ fileContent: string; filename: string; encrypted: boolean }> {
  const bundle = buildBackupBundle(content);
  const dateStr = bundle.exported_at.split('T')[0];
  const cleanName = (bundle.candidate_name || 'candidato')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_') || 'candidato';

  // La contraseña se usa tal cual (sin recortar espacios); solo se exige que no esté vacía.
  const passphrase = options.passphrase ?? '';
  if (passphrase.trim()) {
    const encryptedPkg = await encryptText(JSON.stringify(bundle), passphrase, options.hint?.trim() || undefined);
    return {
      fileContent: JSON.stringify(encryptedPkg, null, 2),
      filename: `oportia_cifrado_${cleanName}_${dateStr}.oportia`,
      encrypted: true
    };
  }
  return {
    fileContent: JSON.stringify(bundle, null, 2),
    filename: `oportia_respaldo_${cleanName}_${dateStr}.json`,
    encrypted: false
  };
}

/** Descarga el respaldo completo en el equipo de la persona. */
export async function exportSessionBackupFile(
  content: BackupContent,
  options: { passphrase?: string; hint?: string } = {}
): Promise<{ encrypted: boolean; filename: string }> {
  const { fileContent, filename, encrypted } = await serializeBackup(content, options);
  const blob = new Blob([fileContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { encrypted, filename };
}

export async function parseSessionBackupFile(
  file: File | Blob | string,
  passphrase?: string
): Promise<SessionBackupBundle['payload']> {
  const text = typeof file === 'string' ? file : await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo seleccionado no tiene un formato válido.');
  }

  // Handle AES-GCM 256-bit encrypted packages
  if (parsed.encrypted === true || parsed.format_version === '2.0-encrypted') {
    if (!passphrase) {
      const err: any = new Error('El archivo de respaldo está cifrado con contraseña.');
      err.isEncrypted = true;
      err.hint = parsed.hint;
      throw err;
    }

    const decryptedText = await decryptPackage(parsed as EncryptedPackage, passphrase);
    try {
      parsed = JSON.parse(decryptedText);
    } catch {
      throw new Error('El contenido descifrado está dañado o no es válido.');
    }
  }

  // Validate format (compatible with both Oportia Jobs IA and legacy NexusJob AI)
  if ((parsed.app === 'Oportia Jobs IA' || parsed.app === 'NexusJob AI') && parsed.payload) {
    return {
      profile: parsed.payload.profile || null,
      preferences: parsed.payload.preferences || null,
      jobs: Array.isArray(parsed.payload.jobs) ? parsed.payload.jobs : [],
      applications: Array.isArray(parsed.payload.applications) ? parsed.payload.applications : [],
      coach_data: parsed.payload.coach_data || null,
      chat_history: Array.isArray(parsed.payload.chat_history) ? parsed.payload.chat_history : undefined
    };
  }

  // Fallback for direct profile or raw legacy export
  if (parsed.name && parsed.experiences) {
    return {
      profile: parsed as CandidateProfile,
      preferences: null,
      jobs: [],
      applications: [],
      coach_data: null
    };
  }

  throw new Error('El formato del archivo de respaldo no es reconocido por Oportia Jobs IA.');
}
