'use client';

import { useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { signIn, verifyOtp } from '@ultrathing/api-client';

type Phase = 'email' | 'code';

/** Login por OTP del dashboard web. Mismo flujo que el escritorio. */
export function WebLogin() {
  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>, onOk?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onOk?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal.');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'h-10 w-full rounded border border-line bg-elevated px-3 text-sm text-text outline-none focus:border-gold';

  return (
    <main className="grid min-h-screen place-items-center bg-base p-8">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl text-text">
          Ultra<span className="text-gold">thing</span> · Panel
        </h1>
        <p className="mb-5 text-sm text-text-muted">
          {phase === 'email'
            ? 'Entra con tu correo para ver tu panel.'
            : `Escribe el código que enviamos a ${email}.`}
        </p>

        {phase === 'email' ? (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className={input}
            />
            <Button
              onClick={() => run(() => signIn(email.trim()), () => setPhase('code'))}
              disabled={busy || !email.includes('@')}
            >
              {busy ? 'Enviando…' : 'Enviar código'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className={input}
            />
            <Button
              onClick={() => run(() => verifyOtp(email.trim(), code.trim()))}
              disabled={busy || code.length < 6}
            >
              {busy ? 'Verificando…' : 'Entrar'}
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </Card>
    </main>
  );
}
