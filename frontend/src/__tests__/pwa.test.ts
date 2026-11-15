import { describe, it, expect } from 'vitest';
import { detectPlatform, isStandalone, canPromptInstall } from '../utils/pwa';

describe('Instalar en el celular', () => {
  it('detecta iPhone, Android y computador', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1')).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36')).toBe('android');
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36')).toBe('desktop');
  });

  it('sin evento del navegador no ofrece el aviso nativo', () => {
    expect(canPromptInstall()).toBe(false);
  });

  it('en el navegador normal no se considera instalada', () => {
    expect(isStandalone()).toBe(false);
  });
});
