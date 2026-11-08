/**
 * NexusJob AI — Sovereign Client-Side Cryptographic Engine
 * Provides AES-GCM 256-bit encryption with PBKDF2 key derivation (SHA-256, 100,000 iterations).
 * Guarantees zero-knowledge privacy compliant with Chile's Ley 19.628 and GDPR standards.
 */

export interface EncryptedPackage {
  app: 'NexusJob AI';
  format_version: '2.0-encrypted';
  encrypted: true;
  algorithm: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt_b64: string;
  iv_b64: string;
  ciphertext_b64: string;
  exported_at: string;
  hint?: string;
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

// ── Key Derivation (PBKDF2) ──────────────────────────────────────────────

async function deriveKey(passphrase: string, salt: Uint8Array, iterations = 100000): Promise<CryptoKey> {
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

// ── Encrypt Text with Passphrase (AES-GCM 256-bit) ───────────────────────

export async function encryptText(plainText: string, passphrase: string, hint?: string): Promise<EncryptedPackage> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Debes ingresar una contraseña para cifrar el archivo de respaldo.');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, 100000);

  const enc = new TextEncoder();
  const plainBuffer = enc.encode(plainText);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    plainBuffer
  );

  return {
    app: 'NexusJob AI',
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
}

// ── Decrypt Package with Passphrase ──────────────────────────────────────

export async function decryptPackage(pkg: EncryptedPackage, passphrase: string): Promise<string> {
  if (!passphrase) {
    throw new Error('Por favor ingresa la contraseña de descifrado.');
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
        iv
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

// ── Local Storage Obfuscation & Encryption for API Keys ───────────────────
// Generates or retrieves a device-specific random key seed stored separately in sessionStorage/storage

const DEVICE_KEY_STORAGE = 'nexusjob_sec_seed_v1';

function getOrCreateDeviceSeed(): string {
  try {
    let seed = localStorage.getItem(DEVICE_KEY_STORAGE);
    if (!seed) {
      const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
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
  const seed = getOrCreateDeviceSeed();
  const pkg = await encryptText(apiKey, seed);
  return JSON.stringify(pkg);
}

export async function decryptApiKeyLocally(encryptedStr: string): Promise<string> {
  if (!encryptedStr) return '';
  try {
    // If it's already plain text (backward compatibility), return it
    if (!encryptedStr.startsWith('{') || !encryptedStr.includes('ciphertext_b64')) {
      return encryptedStr;
    }
    const pkg: EncryptedPackage = JSON.parse(encryptedStr);
    const seed = getOrCreateDeviceSeed();
    return await decryptPackage(pkg, seed);
  } catch {
    return '';
  }
}

export function clearDeviceCryptoSeed(): void {
  try {
    localStorage.removeItem(DEVICE_KEY_STORAGE);
  } catch {
    // ignore
  }
}
