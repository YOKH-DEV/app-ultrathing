'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@ultrathing/api-client';
import { GoogleButton } from '../landing/GoogleButton';

function AuthForm() {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && session) router.replace('/app');
  }, [loading, session, router]);

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(700px 420px at 20% 0%, rgba(229,185,78,0.14), transparent 58%),
            var(--bg-base)
          `,
        }}
      />
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-block font-display text-2xl text-text">
          Ultra<span className="text-gold">thing</span>
        </Link>
        <div className="rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-7 shadow-[var(--glow-soft)] backdrop-blur-[var(--glass-blur)]">
          <h1 className="font-display text-2xl tracking-tight">Entrar al estudio</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Accedé de forma segura con tu cuenta de Google.
          </p>

          <div className="mt-6">
            <GoogleButton label="Entrar con Google" />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[var(--text-faint)]">
            Si es tu primera vez, Google creará tu cuenta de UltraThing automáticamente.
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-[var(--text-faint)]">
          <Link href="/" className="hover:text-gold">
            ← Volver a UltraThing
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function EntrarPage() {
  return <AuthForm />;
}
