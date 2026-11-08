/**
 * NexusJob AI — Sovereign Client-Side Storage & Session Manager
 * Uses browser-native IndexedDB for persistent local-first storage.
 * Guarantees zero personal data retention on cloud/remote servers.
 */

import type {
  CandidateProfile,
  UserPreferences,
  JobPosting,
  ApplicationDraft
} from '../types';

const DB_NAME = 'NexusJob_SovereignDB';
const DB_VERSION = 1;
const STORE_NAME = 'client_session';

export interface SessionBackupBundle {
  app: 'NexusJob AI';
  format_version: '1.0';
  exported_at: string;
  candidate_name?: string;
  payload: {
    profile: CandidateProfile | null;
    preferences: UserPreferences | null;
    jobs: JobPosting[];
    applications: ApplicationDraft[];
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

  // Clear localStorage keys related to NexusJob
  try {
    const keysToRemove = [
      'nexusjob_profile',
      'nexusjob_preferences',
      'nexusjob_jobs',
      'nexusjob_applications',
      'nexusjob_radar_pageSize'
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ── Export / Import Backup Helpers ────────────────────────────────────────

export function exportSessionBackupFile(
  profile: CandidateProfile | null,
  preferences: UserPreferences | null,
  jobs: JobPosting[],
  applications: ApplicationDraft[]
): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const bundle: SessionBackupBundle = {
    app: 'NexusJob AI',
    format_version: '1.0',
    exported_at: new Date().toISOString(),
    candidate_name: profile?.name || 'Candidato',
    payload: {
      profile,
      preferences,
      jobs,
      applications
    }
  };

  const jsonStr = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanName = (profile?.name || 'candidato')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  const filename = `nexusjob_backup_${cleanName}_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function parseSessionBackupFile(file: File): Promise<SessionBackupBundle['payload']> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo seleccionado no es un JSON válido.');
  }

  // Validate format
  if (parsed.app === 'NexusJob AI' && parsed.payload) {
    return {
      profile: parsed.payload.profile || null,
      preferences: parsed.payload.preferences || null,
      jobs: Array.isArray(parsed.payload.jobs) ? parsed.payload.jobs : [],
      applications: Array.isArray(parsed.payload.applications) ? parsed.payload.applications : []
    };
  }

  // Fallback for direct profile or raw export
  if (parsed.name && parsed.experiences) {
    return {
      profile: parsed as CandidateProfile,
      preferences: null,
      jobs: [],
      applications: []
    };
  }

  throw new Error('El formato del archivo de respaldo no es reconocido por NexusJob AI.');
}
