import { Card } from '@ultrathing/ui';
import type { DesktopGoogleOAuth } from './useDesktopGoogleOAuth';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

/** Acceso único con Google. Supabase crea la cuenta en el primer ingreso. */
export function LoginScreen({ start, cancel, busy, phase, error }: DesktopGoogleOAuth) {
  return (
    <main className="grid min-h-screen place-items-center bg-base p-8">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl text-text">
          Ultra<span className="text-gold">thing</span>
        </h1>
        <p className="mb-5 text-sm text-text-muted">Accedé de forma segura con tu cuenta de Google.</p>

        {busy ? (
          <div className="space-y-3">
            <p role="status" aria-live="polite" className="text-center text-sm text-text-muted">
              {phase === 'exchanging' ? 'Completando acceso…' : 'Esperando a Google…'}
            </p>
            {phase === 'authorizing' && (
              <button
                type="button"
                onClick={cancel}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-line bg-transparent text-sm font-medium text-text-muted transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Cancelar y volver a intentar
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-line bg-elevated text-sm font-medium text-text transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <GoogleMark />
            Entrar con Google
          </button>
        )}

        <p className="mt-4 text-xs leading-relaxed text-text-faint">
          Si es tu primera vez, Google creará tu cuenta de UltraThing automáticamente.
        </p>
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </Card>
    </main>
  );
}
