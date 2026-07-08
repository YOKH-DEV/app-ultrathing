import { useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { signIn, verifyOtp } from '@ultrathing/api-client';

type Phase = 'email' | 'code';

/** Login por OTP: pide el correo, envía un código y lo verifica para abrir sesión. */
export function LoginScreen() {
  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim());
      setPhase('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el código.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email.trim(), code.trim());
      // Al verificar, onAuthStateChange actualiza la sesión y el shell cambia solo.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Código inválido.');
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
          Ultra<span className="text-gold">thing</span>
        </h1>
        <p className="mb-5 text-sm text-text-muted">
          {phase === 'email'
            ? 'Entra con tu correo. Te enviamos un código.'
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
            <Button onClick={sendCode} disabled={busy || !email.includes('@')}>
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
            <Button onClick={confirmCode} disabled={busy || code.length < 6}>
              {busy ? 'Verificando…' : 'Entrar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPhase('email')} disabled={busy}>
              Usar otro correo
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </Card>
    </main>
  );
}
