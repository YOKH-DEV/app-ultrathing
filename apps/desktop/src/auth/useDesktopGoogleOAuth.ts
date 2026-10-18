import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';
import { exchangeGoogleOAuthCode, prepareGoogleOAuth } from '@ultrathing/api-client';
import { parseDesktopOAuthCallback } from './desktopOAuthCallback';
import {
  canExchangeDesktopOAuthCode,
  clearDesktopOAuthPending,
  loadDesktopOAuthPending,
  saveDesktopOAuthPending,
  type DesktopOAuthPending,
} from './desktopOAuthPending';

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

function loadInitialPending(): DesktopOAuthPending | null {
  if (typeof window === 'undefined') return null;
  try {
    return loadDesktopOAuthPending(window.localStorage);
  } catch {
    return null;
  }
}

function clearStoredPending(flowId: string): void {
  try {
    clearDesktopOAuthPending(window.localStorage, flowId);
  } catch {
    // El estado en memoria sigue aislando el intento; el error original conserva prioridad.
  }
}

/** Coordina PKCE en el navegador del sistema y consume el deep link de regreso. */
export function useDesktopGoogleOAuth(): DesktopGoogleOAuth {
  const [initialPending] = useState(loadInitialPending);
  const [busy, setBusy] = useState(initialPending !== null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<DesktopOAuthPending | null>(initialPending);
  const busyRef = useRef(initialPending !== null);
  const mountedRef = useRef(false);
  const operationRef = useRef(0);
  const handledUrlsRef = useRef(new Set<string>());
  const exchangingFlowIdsRef = useRef(new Set<string>());

  const setBusyState = useCallback((next: boolean) => {
    busyRef.current = next;
    if (mountedRef.current) setBusy(next);
  }, []);

  const consumeUrl = useCallback(
    async (rawUrl: string) => {
      if (handledUrlsRef.current.has(rawUrl)) return;
      handledUrlsRef.current.add(rawUrl);

      let callback;
      try {
        callback = parseDesktopOAuthCallback(rawUrl);
      } catch (callbackError) {
        if (mountedRef.current) setError(readableError(callbackError));
        return;
      }

      if (callback.kind === 'error') {
        if (mountedRef.current) setError(callback.message);
        return;
      }

      let pending: DesktopOAuthPending | null;
      try {
        pending = loadDesktopOAuthPending(window.localStorage);
      } catch (storageError) {
        if (mountedRef.current) setError(readableError(storageError));
        return;
      }
      pendingRef.current = pending;

      if (!canExchangeDesktopOAuthCode(pending, callback.flowId, exchangingFlowIdsRef.current)) {
        if (!pending) setBusyState(false);
        return;
      }

      exchangingFlowIdsRef.current.add(callback.flowId);
      try {
        await exchangeGoogleOAuthCode(callback.code);
        clearStoredPending(callback.flowId);
        if (pendingRef.current?.flowId === callback.flowId) {
          pendingRef.current = null;
          if (mountedRef.current) setBusyState(false);
        }
      } catch (callbackError) {
        clearStoredPending(callback.flowId);
        if (pendingRef.current?.flowId === callback.flowId) {
          pendingRef.current = null;
          if (mountedRef.current) {
            setError(readableError(callbackError));
            setBusyState(false);
          }
        }
      } finally {
        exchangingFlowIdsRef.current.delete(callback.flowId);
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
    let flowId: string | null = null;
    setBusyState(true);
    setError(null);
    try {
      flowId = crypto.randomUUID();
      const pending = { flowId, createdAt: Date.now() };
      const authorizeUrl = await prepareGoogleOAuth(`${DESKTOP_REDIRECT_TO}#flow=${flowId}`);
      if (!mountedRef.current || operationRef.current !== operation) return;
      saveDesktopOAuthPending(window.localStorage, pending);
      pendingRef.current = pending;
      await openUrl(authorizeUrl);
    } catch (startError) {
      if (mountedRef.current && operationRef.current === operation) {
        if (flowId) clearStoredPending(flowId);
        if (flowId && pendingRef.current?.flowId === flowId) pendingRef.current = null;
        setError(readableError(startError));
        setBusyState(false);
      }
    }
  }, [setBusyState]);

  const cancel = useCallback(() => {
    if (!busyRef.current) return;
    const flowId = pendingRef.current?.flowId;
    operationRef.current += 1;
    if (flowId) clearStoredPending(flowId);
    pendingRef.current = null;
    setBusyState(false);
    setError('Acceso cancelado. Podés volver a intentarlo.');
  }, [setBusyState]);

  return { start, cancel, busy, error };
}
