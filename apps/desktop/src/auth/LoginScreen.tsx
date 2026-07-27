import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Card } from '@ultrathing/ui';
import { signIn, signUp } from '@ultrathing/api-client';

type Mode = 'login' | 'register';

/** Acceso por correo y contraseña: entrar a una cuenta o crear una nueva. */
export function LoginScreen() {
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
        // onAuthStateChange actualiza la sesión y el shell cambia solo.
      } else {
        const active = await signUp(email.trim(), password);
        if (!active) {
          // Supabase exige confirmar el correo: la cuenta existe pero aún no hay sesión.
          setNotice('Cuenta creada. Revisa tu correo para confirmarla y luego entra.');
          setMode('login');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la operación.');
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
          Ultra<span className="text-gold">thing</span>
        </h1>
        <p className="mb-5 text-sm text-text-muted">
          {mode === 'login' ? 'Entra con tu cuenta.' : 'Crea tu cuenta para empezar.'}
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
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
