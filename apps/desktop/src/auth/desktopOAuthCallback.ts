const CALLBACK_PROTOCOL = 'com.ultrathing.desktop:';
const CALLBACK_HOST = 'auth';
const CALLBACK_PATH = '/callback';

const TOKEN_PARAMETER = /(^|_)token($|_)/i;

export type DesktopOAuthCallback =
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string };

/** Valida el deep link antes de entregar el código de un solo uso a Supabase. */
export function parseDesktopOAuthCallback(rawUrl: string): DesktopOAuthCallback {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('UltraThing recibió un callback de Google inválido.');
  }

  if (
    url.protocol !== CALLBACK_PROTOCOL ||
    url.hostname !== CALLBACK_HOST ||
    url.port !== '' ||
    url.pathname !== CALLBACK_PATH ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new Error('UltraThing rechazó un callback de Google no permitido.');
  }

  if (url.hash !== '' || [...url.searchParams.keys()].some((key) => TOKEN_PARAMETER.test(key))) {
    throw new Error('UltraThing rechazó un callback que exponía credenciales.');
  }

  const oauthErrors = url.searchParams.getAll('error');
  if (oauthErrors.length > 1) {
    throw new Error('UltraThing recibió una respuesta ambigua de Google.');
  }
  if (oauthErrors.length === 1) {
    return {
      kind: 'error',
      message:
        oauthErrors[0] === 'access_denied'
          ? 'Cancelaste el acceso con Google.'
          : 'Google no pudo completar el acceso. Intentá de nuevo.',
    };
  }

  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0]?.trim()) {
    throw new Error('El callback de Google no contiene un código válido.');
  }

  return { kind: 'code', code: codes[0] };
}
