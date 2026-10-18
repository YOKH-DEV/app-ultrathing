import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';
import { exchangeGoogleOAuthCode, prepareGoogleOAuth } from '@ultrathing/api-client';
import { parseDesktopOAuthCallback } from './desktopOAuthCallback';

const DESKTOP_REDIRECT_TO = 'com.ultrathing.desktop://auth/callback';

export type DesktopGoogleOAuth = {
  start: () => Promise<void>;
  cancel: () => void;
  busy: boolean;
  error: string | null;
};

function readableError(error: unknown): string {
  const raw = error instanceof Error ? error.message : '';
  if (/provider|unsupported|disabled/i.test(raw)) {
    return 'El acceso con Google no está disponible. Intentá de nuevo en unos minutos.';
  }
  return raw || 'No se pudo completar el acceso con Google. Intentá de nuevo.';
}

/** Coordina PKCE en el navegador del sistema y consume el deep link de regreso. */
export function useDesktopGoogleOAuth(): DesktopGoogleOAuth {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const operationRef = useRef(0);
  const handledUrlsRef = useRef(new Set<string>());

  const setBusyState = useCallback((next: boolean) => {
    busyRef.current = next;
    if (mountedRef.current) setBusy(next);
  }, []);

  const consumeUrl = useCallback(
    async (rawUrl: string) => {
      if (handledUrlsRef.current.has(rawUrl)) return;
      handledUrlsRef.current.add(rawUrl);

      if (!busyRef.current) return;
      const operation = operationRef.current;
      try {
        const callback = parseDesktopOAuthCallback(rawUrl);
        if (callback.kind === 'error') throw new Error(callback.message);
        await exchangeGoogleOAuthCode(callback.code);
        if (mountedRef.current && operationRef.current === operation) setBusyState(false);
      } catch (callbackError) {
        if (mountedRef.current && operationRef.current === operation) {
          setError(readableError(callbackError));
          setBusyState(false);
        }
      }
    },
    [setBusyState],
  );

  const consumeUrls = useCallback(
    async (urls: string[]) => {
      for (const url of urls) await consumeUrl(url);
    },
    [consumeUrl],
  );

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    let stopListening: (() => void) | undefined;

    void (async () => {
      stopListening = await onOpenUrl((urls) => {
        if (active) void consumeUrls(urls);
      });
      if (!active) {
        stopListening();
        return;
      }

      const initialUrls = await getCurrent();
      if (active && initialUrls) await consumeUrls(initialUrls);
    })().catch((listenerError: unknown) => {
      if (active) setError(readableError(listenerError));
    });

    return () => {
      active = false;
      mountedRef.current = false;
      operationRef.current += 1;
      stopListening?.();
    };
  }, [consumeUrls]);

  const start = useCallback(async () => {
    if (busyRef.current) return;
    const operation = ++operationRef.current;
    setBusyState(true);
    setError(null);
    try {
      const authorizeUrl = await prepareGoogleOAuth(DESKTOP_REDIRECT_TO);
      if (!mountedRef.current || operationRef.current !== operation) return;
      await openUrl(authorizeUrl);
    } catch (startError) {
      if (mountedRef.current && operationRef.current === operation) {
        setError(readableError(startError));
        setBusyState(false);
      }
    }
  }, [setBusyState]);

  const cancel = useCallback(() => {
    if (!busyRef.current) return;
    operationRef.current += 1;
    setBusyState(false);
    setError('Acceso cancelado. Podés volver a intentarlo.');
  }, [setBusyState]);

  return { start, cancel, busy, error };
}
