import { describe, it, expect } from 'vitest';
import {
  encryptText,
  decryptPackage,
  xorObfuscate,
  xorDeobfuscate,
  bufferToBase64,
  base64ToBuffer,
  encryptApiKeyLocally,
  decryptApiKeyLocally,
  clearDeviceCryptoSeed
} from '../utils/crypto';

describe('Sovereign Cryptographic Engine (crypto.ts)', () => {
  it('cifra y descifra texto usando WebCrypto o fallback de forma determinista', async () => {
    const secretText = 'Información confidencial del candidato: Alex Dev, Rut 12.345.678-9';
    const password = 'Clave-Segura-2026!';

    const pkg = await encryptText(secretText, password, 'Pista de clave');

    expect(pkg.encrypted).toBe(true);
    expect(pkg.app).toBe('Oportia Jobs IA');
    expect(pkg.ciphertext_b64).toBeTruthy();
    expect(pkg.hint).toBe('Pista de clave');

    const decrypted = await decryptPackage(pkg, password);
    expect(decrypted).toBe(secretText);
  });

  it('rechaza el descifrado cuando la contraseña es incorrecta', async () => {
    const secretText = 'Texto confidencial';
    const password = 'PasswordCorrecta123';
    const wrongPassword = 'PasswordIncorrecta999';

    const pkg = await encryptText(secretText, password);
    await expect(decryptPackage(pkg, wrongPassword)).rejects.toThrow();
  });

  it('rechaza cifrar si la contraseña está vacía', async () => {
    await expect(encryptText('Texto', '')).rejects.toThrow('Debes ingresar una contraseña');
    await expect(encryptText('Texto', '   ')).rejects.toThrow('Debes ingresar una contraseña');
  });

  it('convierte buffers a base64 y viceversa sin pérdida de datos', () => {
    const raw = new Uint8Array([0, 1, 2, 128, 255, 64]);
    const b64 = bufferToBase64(raw);
    const roundtrip = new Uint8Array(base64ToBuffer(b64));

    expect(Array.from(roundtrip)).toEqual(Array.from(raw));
  });

  it('aplica ofuscación XOR de forma simétrica para entornos no seguros', () => {
    const text = 'Soberanía de datos 100% chilena';
    const seed = 'clave-dispositivo-xyz';

    const obfuscated = xorObfuscate(text, seed);
    expect(obfuscated).not.toBe(text);

    const restored = xorDeobfuscate(obfuscated, seed);
    expect(restored).toBe(text);
  });

  it('cifra y descifra llaves API vinculadas al dispositivo local', async () => {
    clearDeviceCryptoSeed();
    const testApiKey = 'sk-or-v1-abcdef1234567890';

    const encrypted = await encryptApiKeyLocally(testApiKey);
    expect(encrypted).not.toBe(testApiKey);

    const decrypted = await decryptApiKeyLocally(encrypted);
    expect(decrypted).toBe(testApiKey);
  });
});

describe('Claves de API con CryptoKey no exportable (1.6.10, DT-28)', () => {
  const reset = async () => {
    localStorage.clear();
    clearDeviceCryptoSeed();
    await new Promise((r) => setTimeout(r, 0));
  };

  it('cifra con el formato v2 sin crear la semilla en localStorage', async () => {
    await reset();
    const enc = await encryptApiKeyLocally('AIzaSy-clave-de-prueba');
    expect(enc.startsWith('oportia_v2:')).toBe(true);
    expect(enc).not.toContain('AIzaSy');
    expect(localStorage.getItem('nexusjob_sec_seed_v1')).toBeNull();
    expect(await decryptApiKeyLocally(enc)).toBe('AIzaSy-clave-de-prueba');
  });

  it('la clave del dispositivo no se puede exportar', async () => {
    await reset();
    const { getDeviceKey } = await import('../utils/crypto');
    const key = await getDeviceKey();
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toBeTruthy();
  });

  it('migra las claves guardadas con la semilla y borra la semilla', async () => {
    await reset();
    // Clave guardada como en la 1.6.9: paquete AES con la semilla de localStorage.
    const seed = 'semilla-antigua-de-prueba';
    localStorage.setItem('nexusjob_sec_seed_v1', seed);
    localStorage.setItem('job_search_llm_key_gemini', JSON.stringify(await encryptText('clave-gemini-antigua', seed)));
    localStorage.setItem('job_search_llm_key_openai', `nexus_dev_v1:${xorObfuscate('clave-openai-antigua', seed)}`);

    const { migrateApiKeysToDeviceKey } = await import('../utils/crypto');
    expect(await migrateApiKeysToDeviceKey()).toBe(2);
    expect(localStorage.getItem('nexusjob_sec_seed_v1')).toBeNull();
    expect(localStorage.getItem('job_search_llm_key_gemini')!.startsWith('oportia_v2:')).toBe(true);
    expect(await decryptApiKeyLocally(localStorage.getItem('job_search_llm_key_gemini')!)).toBe('clave-gemini-antigua');
    expect(await decryptApiKeyLocally(localStorage.getItem('job_search_llm_key_openai')!)).toBe('clave-openai-antigua');
    expect(await migrateApiKeysToDeviceKey()).toBe(0); // ya migradas
  });

  it('si una clave antigua no se puede leer, no toca nada', async () => {
    await reset();
    localStorage.setItem('nexusjob_sec_seed_v1', 'otra-semilla');
    const broken = JSON.stringify(await encryptText('x', 'semilla-distinta'));
    localStorage.setItem('job_search_llm_key_claude', broken);
    const { migrateApiKeysToDeviceKey } = await import('../utils/crypto');
    expect(await migrateApiKeysToDeviceKey()).toBe(0);
    expect(localStorage.getItem('job_search_llm_key_claude')).toBe(broken);
    expect(localStorage.getItem('nexusjob_sec_seed_v1')).toBe('otra-semilla');
  });
});
