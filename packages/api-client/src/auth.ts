import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Inicia sesión con correo y contraseña. Abre la sesión si las credenciales son válidas. */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Crea una cuenta con correo y contraseña.
 * Devuelve `true` si la sesión quedó abierta al instante (confirmación de correo
 * desactivada en Supabase), o `false` si el proyecto exige confirmar el correo
 * antes de poder entrar — en ese caso el usuario existe pero aún no hay sesión.
 */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return Boolean(data.session);
}

/** Cierra la sesión actual. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Entra con Google (Gmail). Redirige al proveedor y vuelve a `/auth/callback`. */
export async function signInWithGoogle(): Promise<void> {
  const origin = window.location.origin;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account', access_type: 'online' },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google no devolvió una URL de entrada.');
  window.location.assign(data.url);
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
