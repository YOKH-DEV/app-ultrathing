'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@ultrathing/ui';
import { signIn, signUp, useSession } from '@ultrathing/api-client';
import { GoogleButton } from '../landing/GoogleButton';

type Mode = 'login' | 'register';

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off ? (
        <>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </>
      ) : (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function AuthForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<Mode>(params.get('modo') === 'registro' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) router.replace('/app');
  }, [loading, session, router]);

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        router.replace('/app');
      } else {
        const active = await signUp(email.trim(), password);
        if (active) {
          router.replace('/app');
        } else {
          setNotice('Cuenta creada. Confirmá el correo y después entrá.');
          setMode('login');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo entrar. Probá de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'h-11 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 text-sm text-text outline-none focus:border-gold';
  const valid = email.includes('@') && password.length >= 6;

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
          <h1 className="font-display text-2xl tracking-tight">
            {mode === 'login' ? 'Entrar al estudio' : 'Crear tu cuenta'}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {mode === 'login'
              ? 'Tu panel, tus piezas, tus leads.'
              : 'Una cuenta. Diseño, copy, voz y el resto de la mesa.'}
          </p>

          <div className="mt-6">
            <GoogleButton />
          </div>
          <p className="my-4 text-center text-xs uppercase tracking-[0.16em] text-[var(--text-faint)]">
            o con correo
          </p>

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy && valid) submit();
            }}
          >
            <label className="text-xs text-[var(--text-muted)]">
              Correo
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className={`${input} mt-1`}
              />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              Contraseña
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`${input} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-[var(--text-muted)] hover:text-gold"
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </label>
            <Button type="submit" disabled={busy || !valid} className="mt-2">
              {busy
                ? mode === 'login'
                  ? 'Entrando…'
                  : 'Creando…'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Crear cuenta'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
              setNotice(null);
            }}
            disabled={busy}
            className="mt-4 text-sm text-[var(--text-muted)] transition-colors hover:text-gold"
          >
            {mode === 'login' ? '¿No tenés cuenta? Crear una' : '¿Ya tenés cuenta? Entrar'}
          </button>

          {notice && <p className="mt-3 text-sm text-gold">{notice}</p>}
          {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
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
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center">
          <p className="text-sm text-[var(--text-muted)]">Cargando…</p>
        </main>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
