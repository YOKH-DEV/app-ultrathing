import { describe, expect, it } from 'vitest';
import { parseDesktopOAuthCallback } from './desktopOAuthCallback';

describe('parseDesktopOAuthCallback', () => {
  it('acepta únicamente el callback directo con un código PKCE', () => {
    expect(
      parseDesktopOAuthCallback('com.ultrathing.desktop://auth/callback?code=one-time-code'),
    ).toEqual({ kind: 'code', code: 'one-time-code' });
  });

  it.each([
    'https://auth/callback?code=x',
    'com.ultrathing.desktop://attacker/callback?code=x',
    'com.ultrathing.desktop://auth/other?code=x',
    'com.ultrathing.desktop://auth/callback?code=x&code=y',
  ])('rechaza origen, ruta o código ambiguo: %s', (url) => {
    expect(() => parseDesktopOAuthCallback(url)).toThrow();
  });

  it.each([
    'com.ultrathing.desktop://auth/callback?access_token=secret',
    'com.ultrathing.desktop://auth/callback?provider_token=secret',
    'com.ultrathing.desktop://auth/callback#refresh_token=secret',
  ])('rechaza tokens expuestos en el deep link: %s', (url) => {
    expect(() => parseDesktopOAuthCallback(url)).toThrow(/credenciales/);
  });

  it('convierte la cancelación del proveedor en un error seguro', () => {
    expect(
      parseDesktopOAuthCallback(
        'com.ultrathing.desktop://auth/callback?error=access_denied&error_description=raw',
      ),
    ).toEqual({ kind: 'error', message: 'Cancelaste el acceso con Google.' });
  });
});
