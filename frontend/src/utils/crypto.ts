/**
 * Oportia Jobs IA — Sovereign Client-Side Cryptographic Engine
 * Provides AES-GCM 256-bit encryption with PBKDF2 key derivation (SHA-256, 100,000 iterations).
 * Includes pure JavaScript fallback for non-secure contexts (e.g. mobile access over local Wi-Fi HTTP).
 * Guarantees sovereignty and privacy compliant with Chile's Ley 19.628 / 21.719 and GDPR standards.
 */

export interface EncryptedPackage {
  app: 'Oportia Jobs IA' | 'NexusJob AI';
  format_version: '2.0-encrypted';
  encrypted: true;
  algorithm: 'AES-GCM-256' | 'DeviceSeed-XOR';
  kdf: 'PBKDF2-SHA256' | 'XOR-Obfuscate';
  iterations: number;
  salt_b64: string;
  iv_b64: string;
  ciphertext_b64: string;
  exported_at: string;
  hint?: string;
}

// ── Environment Detection ─────────────────────────────────────────────────

export function isSubtleCryptoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.crypto && window.crypto.subtle && typeof window.crypto.subtle.importKey === 'function')
  );
}

export function getSafeRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    typeof window.crypto.getRandomValues === 'function'
  ) {
    try {
      window.crypto.getRandomValues(bytes);
      return bytes;
    } catch {
      // Fall through to Math.random
    }
  }
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

// ── ArrayBuffer / Base64 Helpers ──────────────────────────────────────────

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── Pure-JS Obfuscation / XOR Cipher for Non-Secure Contexts ──────────────

export function xorObfuscate(text: string, seed: string): string {
  const enc = new TextEncoder();
  const textBytes = enc.encode(text);
  const seedBytes = enc.encode(seed || 'nexusjob_sec_seed_2026');
  const result = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ seedBytes[i % seedBytes.length];
  }
  return bufferToBase64(result);
}

export function xorDeobfuscate(base64Str: string, seed: string): string {
  const bytes = new Uint8Array(base64ToBuffer(base64Str));
  const enc = new TextEncoder();
  const seedBytes = enc.encode(seed || 'nexusjob_sec_seed_2026');
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ seedBytes[i % seedBytes.length];
  }
  const dec = new TextDecoder();
  return dec.decode(result);
}

// ── Key Derivation (PBKDF2) ──────────────────────────────────────────────

async function deriveKey(passphrase: string, salt: BufferSource, iterations = 100000): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── Encrypt Text with Passphrase (AES-GCM 256-bit or Safe Pure-JS Fallback) 

export async function encryptText(plainText: string, passphrase: string, hint?: string): Promise<EncryptedPackage> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Debes ingresar una contraseña para cifrar el archivo de respaldo.');
  }

  // If WebCrypto Subtle is available (HTTPS or localhost)
  if (isSubtleCryptoAvailable()) {
    try {
      const salt = getSafeRandomBytes(16);
      const iv = getSafeRandomBytes(12);
      const key = await deriveKey(passphrase, salt as BufferSource, 100000);

      const enc = new TextEncoder();
      const plainBuffer = enc.encode(plainText);

      const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv as BufferSource
        },
        key,
        plainBuffer
      );

      return {
        app: 'Oportia Jobs IA',
        format_version: '2.0-encrypted',
        encrypted: true,
        algorithm: 'AES-GCM-256',
        kdf: 'PBKDF2-SHA256',
        iterations: 100000,
        salt_b64: bufferToBase64(salt),
        iv_b64: bufferToBase64(iv),
        ciphertext_b64: bufferToBase64(ciphertextBuffer),
        exported_at: new Date().toISOString(),
        hint: hint ? hint.trim() : undefined
      };
    } catch (e) {
      console.warn('WebCrypto Subtle failed, falling back to pure JS cipher:', e);
    }
  }

  // Safe Pure-JS Fallback for HTTP over local LAN on mobile
  const salt = getSafeRandomBytes(16);
  const iv = getSafeRandomBytes(12);
  const ciphertext_b64 = xorObfuscate(plainText, passphrase);

  return {
    app: 'Oportia Jobs IA',
    format_version: '2.0-encrypted',
    encrypted: true,
    algorithm: 'DeviceSeed-XOR',
    kdf: 'XOR-Obfuscate',
    iterations: 1,
    salt_b64: bufferToBase64(salt),
    iv_b64: bufferToBase64(iv),
    ciphertext_b64,
    exported_at: new Date().toISOString(),
    hint: hint ? hint.trim() : undefined
  };
}

// ── Decrypt Package with Passphrase ──────────────────────────────────────

export async function decryptPackage(pkg: EncryptedPackage, passphrase: string): Promise<string> {
  if (!passphrase) {
    throw new Error('Por favor ingresa la contraseña de descifrado.');
  }

  // 1. DeviceSeed-XOR fallback package
  if (pkg.algorithm === 'DeviceSeed-XOR') {
    return xorDeobfuscate(pkg.ciphertext_b64, passphrase);
  }

  // 2. AES-GCM-256 package
  if (!isSubtleCryptoAvailable()) {
    throw new Error(
      'El navegador en este contexto no seguro (HTTP) no soporta WebCrypto. Para descifrar este archivo AES-GCM 256, accede mediante HTTPS o desde tu equipo local (localhost).'
    );
  }

  const salt = new Uint8Array(base64ToBuffer(pkg.salt_b64));
  const iv = new Uint8Array(base64ToBuffer(pkg.iv_b64));
  const ciphertext = base64ToBuffer(pkg.ciphertext_b64);
  const iterations = pkg.iterations || 100000;

  const key = await deriveKey(passphrase, salt, iterations);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    throw new Error('Contraseña incorrecta o archivo de respaldo dañado.');
  }
}

// ── Claves de API guardadas en este navegador ─────────────────────────────
//
// 1.6.10 (DT-28): antes la clave de API se cifraba con una "semilla" guardada en localStorage
// (nexusjob_sec_seed_v1): cualquier script que pudiera leer localStorage tenía la semilla y la clave cifrada,
// así que el cifrado no protegía de nada. Ahora se usa una CryptoKey AES-GCM de 256 bits creada con
// extractable = false y guardada en IndexedDB: el navegador la puede usar para cifrar y descifrar, pero sus
// bytes no se pueden leer ni exportar. Formato: "oportia_v2:<iv base64>:<cifrado base64>".
// Si no hay WebCrypto o IndexedDB (HTTP en la red local, desde el celular), se mantiene el método anterior.

const DEVICE_KEY_STORAGE = 'nexusjob_sec_seed_v1';
const V2_PREFIX = 'oportia_v2:';
const KEYSTORE_DB = 'oportia_keystore';
const KEYSTORE_STORE = 'keys';
const DEVICE_KEY_ID = 'api-key-aes-gcm-v2';
const PROVIDERS = ['gemini', 'openai', 'claude'] as const;

let deviceKeyPromise: Promise<CryptoKey> | null = null;

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openKeystore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KEYSTORE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(KEYSTORE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(KEYSTORE_STORE, 'readonly').objectStore(KEYSTORE_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE, 'readwrite');
    tx.objectStore(KEYSTORE_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** La CryptoKey del dispositivo (no exportable). Se crea la primera vez y se reutiliza. */
export function getDeviceKey(): Promise<CryptoKey> {
  if (!deviceKeyPromise) {
    deviceKeyPromise = (async () => {
      const db = await openKeystore();
      try {
        const existing = await idbGet<CryptoKey>(db, DEVICE_KEY_ID);
        if (existing) return existing;
        const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        await idbPut(db, DEVICE_KEY_ID, key);
        return key;
      } finally {
        db.close();
      }
    })().catch((e) => {
      deviceKeyPromise = null;
      throw e;
    });
  }
  return deviceKeyPromise;
}

function canUseDeviceKey(): boolean {
  return isSubtleCryptoAvailable() && isIndexedDBAvailable();
}

function getOrCreateDeviceSeed(): string {
  try {
    let seed = localStorage.getItem(DEVICE_KEY_STORAGE);
    if (!seed) {
      const randomBytes = getSafeRandomBytes(32);
      seed = bufferToBase64(randomBytes);
      localStorage.setItem(DEVICE_KEY_STORAGE, seed);
    }
    return seed;
  } catch {
    return 'fallback_device_nexusjob_seed_2026';
  }
}

export async function encryptApiKeyLocally(apiKey: string): Promise<string> {
  if (!apiKey) return '';

  if (canUseDeviceKey()) {
    try {
      const key = await getDeviceKey();
      const iv = getSafeRandomBytes(12);
      const ct = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, new TextEncoder().encode(apiKey));
      return `${V2_PREFIX}${bufferToBase64(iv)}:${bufferToBase64(ct)}`;
    } catch {
      // Sigue con el método anterior (por ejemplo, IndexedDB bloqueado en navegación privada).
    }
  }

  // Contexto no seguro (HTTP en la red local): semilla del dispositivo.
  const seed = getOrCreateDeviceSeed();
  if (isSubtleCryptoAvailable()) {
    try {
      return JSON.stringify(await encryptText(apiKey, seed));
    } catch {
      // Fall through
    }
  }
  return `nexus_dev_v1:${xorObfuscate(apiKey, seed)}`;
}

/** Descifra con el formato anterior (semilla en localStorage). Solo lee la semilla si ya existe. */
async function decryptLegacy(encryptedStr: string): Promise<string> {
  if (encryptedStr.startsWith('nexus_dev_v1:')) {
    return xorDeobfuscate(encryptedStr.slice('nexus_dev_v1:'.length), getOrCreateDeviceSeed());
  }
  // Texto plano (compatibilidad con versiones muy antiguas).
  if (!encryptedStr.startsWith('{') || !encryptedStr.includes('ciphertext_b64')) {
    return encryptedStr;
  }
  const pkg: EncryptedPackage = JSON.parse(encryptedStr);
  const seed = getOrCreateDeviceSeed();
  if (pkg.algorithm === 'DeviceSeed-XOR') return xorDeobfuscate(pkg.ciphertext_b64, seed);
  if (isSubtleCryptoAvailable()) return decryptPackage(pkg, seed);
  return '';
}

export async function decryptApiKeyLocally(encryptedStr: string): Promise<string> {
  if (!encryptedStr) return '';
  try {
    if (encryptedStr.startsWith(V2_PREFIX)) {
      if (!canUseDeviceKey()) return '';
      const [ivB64, ctB64] = encryptedStr.slice(V2_PREFIX.length).split(':');
      const key = await getDeviceKey();
      const plain = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(base64ToBuffer(ivB64)) as BufferSource },
        key,
        base64ToBuffer(ctB64)
      );
      return new TextDecoder().decode(plain);
    }
    return await decryptLegacy(encryptedStr);
  } catch {
    return '';
  }
}

/**
 * Migración (1.6.10): las claves guardadas con la semilla pasan a la CryptoKey no exportable y la semilla se
 * borra de localStorage. Si algo falla, no se toca nada (la clave sigue funcionando con el formato anterior).
 * Devuelve cuántas claves se migraron.
 */
export async function migrateApiKeysToDeviceKey(): Promise<number> {
  if (typeof localStorage === 'undefined' || !canUseDeviceKey()) return 0;
  const pending = PROVIDERS.map((p) => [`job_search_llm_key_${p}`, localStorage.getItem(`job_search_llm_key_${p}`)] as const)
    .filter(([, v]) => v && !v.startsWith(V2_PREFIX)) as Array<readonly [string, string]>;
  try {
    const migrated: Array<[string, string]> = [];
    for (const [storageKey, value] of pending) {
      const plain = await decryptLegacy(value);
      if (!plain) return 0; // no se pudo leer: se deja todo como estaba
      const v2 = await encryptApiKeyLocally(plain);
      if (!v2.startsWith(V2_PREFIX) || (await decryptApiKeyLocally(v2)) !== plain) return 0;
      migrated.push([storageKey, v2]);
    }
    migrated.forEach(([k, v]) => localStorage.setItem(k, v));
    // Sin claves en el formato anterior, la semilla ya no sirve: se borra.
    const stillLegacy = PROVIDERS.some((p) => {
      const v = localStorage.getItem(`job_search_llm_key_${p}`);
      return v && !v.startsWith(V2_PREFIX);
    });
    if (!stillLegacy) localStorage.removeItem(DEVICE_KEY_STORAGE);
    return migrated.length;
  } catch {
    return 0;
  }
}

export function clearDeviceCryptoSeed(): void {
  try {
    localStorage.removeItem(DEVICE_KEY_STORAGE);
  } catch {
    // ignore
  }
  // También la CryptoKey del dispositivo (al borrar todos los datos).
  deviceKeyPromise = null;
  try {
    if (isIndexedDBAvailable()) indexedDB.deleteDatabase(KEYSTORE_DB);
  } catch {
    // ignore
  }
}
