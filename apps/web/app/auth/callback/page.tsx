'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@ultrathing/api-client';

/** Vuelta de Google: intercambia el `code` por sesión y entra al panel. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error_description') ?? params.get('error');
      const code = params.get('code');
      if (err) {
        if (!cancelled) setError(err);
        return;
      }
      if (!code) {
        router.replace('/entrar');
        return;
      }

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;
      if (data.session) {
        router.replace('/app');
        return;
      }

      // Strict Mode / doble montaje: el primer exchange ya gastó el verifier
      // y dejó la sesión en localStorage. Si existe, entramos igual.
      const { data: existing } = await supabase.auth.getSession();
      if (cancelled) return;
      if (existing.session) {
        router.replace('/app');
        return;
      }
      setError(exchangeError?.message ?? 'No se pudo entrar con Google.');
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      {error ? (
        <div className="max-w-sm text-center">
          <p className="text-sm text-[var(--danger)]">{error}</p>
          <Link href="/entrar" className="mt-4 inline-block text-sm text-gold hover:underline">
            Volver a entrar
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Entrando con Google…</p>
      )}
    </main>
  );
}
