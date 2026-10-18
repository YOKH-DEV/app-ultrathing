import { isDesktopOAuthFlowId } from './desktopOAuthPending';

const CALLBACK_PROTOCOL = 'com.ultrathing.desktop:';
const CALLBACK_HOST = 'auth';
const CALLBACK_PATH = '/callback';
const ALLOWED_PARAMETERS = new Set(['code', 'error', 'error_code', 'error_description']);

export type DesktopOAuthCallback =
  { kind: 'code'; code: string; flowId: string } | { kind: 'error'; message: string };

function parseFlowId(hash: string): string | null {
  if (hash === '') return null;
  const match = /^#flow=([0-9a-f-]+)$/i.exec(hash);
  if (!match || !isDesktopOAuthFlowId(match[1])) {
    throw new Error('UltraThing rechazó una correlación de acceso inválida.');
  }
  return match[1];
}

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

  const flowId = parseFlowId(url.hash);

  const parameterCounts = new Map<string, number>();
  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_PARAMETERS.has(key)) {
      throw new Error('UltraThing rechazó un parámetro de callback no permitido.');
    }
    const count = (parameterCounts.get(key) ?? 0) + 1;
    if (count > 1) {
      throw new Error('UltraThing recibió una respuesta ambigua de Google.');
    }
    parameterCounts.set(key, count);
  }

  const oauthError = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  if (oauthError !== null) {
    if (code !== null) {
      throw new Error('UltraThing recibió una respuesta ambigua de Google.');
    }
    return {
      kind: 'error',
      message:
        oauthError === 'access_denied'
          ? 'Cancelaste el acceso con Google.'
          : 'Google no pudo completar el acceso. Intentá de nuevo.',
    };
  }

  if (url.searchParams.has('error_code') || url.searchParams.has('error_description')) {
    throw new Error('UltraThing recibió una respuesta ambigua de Google.');
  }

  if (!code?.trim()) {
    throw new Error('El callback de Google no contiene un código válido.');
  }
  if (!flowId) {
    throw new Error('El callback de Google no contiene una correlación válida.');
  }

  return { kind: 'code', code, flowId };
}
