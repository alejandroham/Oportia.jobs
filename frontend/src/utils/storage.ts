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
  format_version: '1.0' | '1.1';
  exported_at: string;
  candidate_name?: string;
  payload: {
    profile: CandidateProfile | null;
    preferences: UserPreferences | null;
    jobs: JobPosting[];
    applications: ApplicationDraft[];
    coach_data?: any;
  };
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

export async function exportSessionBackupFile(
  profile: CandidateProfile | null,
  preferences: UserPreferences | null,
  jobs: JobPosting[],
  applications: ApplicationDraft[],
  coachData?: any,
  passphrase?: string,
  hint?: string
): Promise<void> {
  const dateStr = new Date().toISOString().split('T')[0];
  const bundle: SessionBackupBundle = {
    app: 'Oportia Jobs IA',
    format_version: '1.1',
    exported_at: new Date().toISOString(),
    candidate_name: profile?.name || 'Candidato',
    payload: {
      profile,
      preferences,
      jobs,
      applications,
      coach_data: coachData || undefined
    }
  };

  const cleanName = (profile?.name || 'candidato')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  let fileContent: string;
  let filename: string;

  if (passphrase && passphrase.trim().length > 0) {
    // AES-GCM 256-bit encryption
    const rawJson = JSON.stringify(bundle);
    const encryptedPkg = await encryptText(rawJson, passphrase, hint);
    fileContent = JSON.stringify(encryptedPkg, null, 2);
    filename = `oportia_cifrado_${cleanName}_${dateStr}.oportia`;
  } else {
    fileContent = JSON.stringify(bundle, null, 2);
    filename = `oportia_backup_${cleanName}_${dateStr}.json`;
  }

  const blob = new Blob([fileContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function parseSessionBackupFile(
  file: File,
  passphrase?: string
): Promise<SessionBackupBundle['payload']> {
  const text = await file.text();
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
      coach_data: parsed.payload.coach_data || null
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
