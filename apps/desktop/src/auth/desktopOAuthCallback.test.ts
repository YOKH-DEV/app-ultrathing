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
    'com.ultrathing.desktop://auth/callback?error=access_denied&error=server_error',
    'com.ultrathing.desktop://auth/callback?error=access_denied&error_description=x&error_description=y',
    'com.ultrathing.desktop://auth/callback?code=x&error=access_denied',
    'com.ultrathing.desktop://auth/callback?code=x&error_description=unexpected',
  ])('rechaza origen, ruta o código ambiguo: %s', (url) => {
    expect(() => parseDesktopOAuthCallback(url)).toThrow();
  });

  it.each([
    'com.ultrathing.desktop://auth/callback?access_token=secret',
    'com.ultrathing.desktop://auth/callback?accessToken=secret',
    'com.ultrathing.desktop://auth/callback?refresh-token=secret',
    'com.ultrathing.desktop://auth/callback?provider_token=secret',
    'com.ultrathing.desktop://auth/callback?state=unexpected',
    'com.ultrathing.desktop://auth/callback#refresh_token=secret',
  ])('rechaza parámetros fuera de la allowlist: %s', (url) => {
    expect(() => parseDesktopOAuthCallback(url)).toThrow();
  });

  it('convierte la cancelación del proveedor en un error seguro', () => {
    expect(
      parseDesktopOAuthCallback(
        'com.ultrathing.desktop://auth/callback?error=access_denied&error_description=raw',
      ),
    ).toEqual({ kind: 'error', message: 'Cancelaste el acceso con Google.' });
  });

  it('acepta la respuesta OAuth de error con los campos permitidos', () => {
    expect(
      parseDesktopOAuthCallback(
        'com.ultrathing.desktop://auth/callback?error=server_error&error_code=unexpected_failure&error_description=safe',
      ),
    ).toEqual({
      kind: 'error',
      message: 'Google no pudo completar el acceso. Intentá de nuevo.',
    });
  });
});
