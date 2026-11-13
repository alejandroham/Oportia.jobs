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
