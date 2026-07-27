'use client';

import { useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { signIn, signUp } from '@ultrathing/api-client';

type Mode = 'login' | 'register';

/** Ícono de ojo (mostrar/ocultar), SVG inline para no depender de una librería de íconos. */
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

/** Acceso por correo y contraseña del panel web. Mismo flujo que el escritorio. */
export function WebLogin() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        const active = await signUp(email.trim(), password);
        if (!active) {
          setNotice('Cuenta creada. Revisa tu correo para confirmarla y luego entra.');
          setMode('login');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal.');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'h-10 w-full rounded border border-line bg-elevated px-3 text-sm text-text outline-none focus:border-gold';
  const valid = email.includes('@') && password.length >= 6;

  return (
    <main className="grid min-h-screen place-items-center bg-base p-8">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl text-text">
          Ultra<span className="text-gold">thing</span> · Panel
        </h1>
        <p className="mb-5 text-sm text-text-muted">
          {mode === 'login' ? 'Entra con tu cuenta para ver tu panel.' : 'Crea tu cuenta para empezar.'}
        </p>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && valid) submit();
          }}
        >
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className={input}
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña (mín. 6 caracteres)"
              className={`${input} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-text-muted transition-colors hover:text-gold"
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
          <Button type="submit" disabled={busy || !valid}>
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
          className="mt-4 text-sm text-text-muted transition-colors hover:text-gold"
        >
          {mode === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Entrar'}
        </button>

        {notice && <p className="mt-3 text-sm text-gold">{notice}</p>}
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </Card>
    </main>
  );
}
