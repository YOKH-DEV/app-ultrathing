import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

const SUPABASE_AUTH_ORIGIN = 'https://vgtwylbmefujgvhsgrre.supabase.co';
const SUPABASE_AUTHORIZE_PATH = '/auth/v1/authorize';

/** Cierra la sesión actual. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Prepara PKCE y devuelve únicamente la URL de autorización validada de Supabase. */
export async function prepareGoogleOAuth(redirectTo: string): Promise<string> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account', access_type: 'online' },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google no devolvió una URL de entrada.');

  let authorizeUrl: URL;
  try {
    authorizeUrl = new URL(data.url);
  } catch {
    throw new Error('Google devolvió una URL de entrada inválida.');
  }

  if (
    authorizeUrl.protocol !== 'https:' ||
    authorizeUrl.origin !== SUPABASE_AUTH_ORIGIN ||
    authorizeUrl.pathname !== SUPABASE_AUTHORIZE_PATH ||
    authorizeUrl.username !== '' ||
    authorizeUrl.password !== '' ||
    authorizeUrl.hash !== ''
  ) {
    throw new Error('Supabase devolvió un destino de autorización no permitido.');
  }

  return authorizeUrl.toString();
}

/** Entra con Google en la web y vuelve a `/auth/callback`. */
export async function signInWithGoogle(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('El acceso con Google requiere un navegador.');
  }
  const authorizeUrl = await prepareGoogleOAuth(`${window.location.origin}/auth/callback`);
  window.location.assign(authorizeUrl);
}

/** Intercambia el código PKCE y deja la sesión persistida sin exponer sus tokens. */
export async function exchangeGoogleOAuthCode(code: string): Promise<void> {
  if (!code.trim()) throw new Error('El callback de Google no contiene un código válido.');
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  if (!data.session) throw new Error('Google no devolvió una sesión válida.');
}

/** Sesión reactiva. La librería persiste el token; sobrevive recargas. */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
