'use client';

import { useState } from 'react';
import { signInWithGoogle } from '@ultrathing/api-client';

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

export function GoogleButton({ label = 'Continuar con Google' }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'No se pudo abrir Google.';
      setError(
        /provider|Unsupported|disabled/i.test(raw)
          ? 'Google todavía no está habilitado en este proyecto. Entrá con correo mientras tanto.'
          : raw,
      );
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-elevated)] text-sm font-medium text-text transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
      >
        <GoogleMark />
        {busy ? 'Abriendo Google…' : label}
      </button>
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
