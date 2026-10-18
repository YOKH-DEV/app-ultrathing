'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, cn } from '@ultrathing/ui';
import { featuresFor } from '@ultrathing/core';
import { signOut, useSession } from '@ultrathing/api-client';
import '../features';
import { EngineBanner } from '../engine';

export function AppShell({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const features = featuresFor('web');

  useEffect(() => {
    if (!loading && !session) router.replace('/entrar');
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-sm text-[var(--text-muted)]">Cargando sesión…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-base">
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMenuOpen(false)}
          role="presentation"
        />
      )}
      <aside
        className={cn(
          'z-40 flex w-56 shrink-0 flex-col border-r border-[var(--glass-border)]',
          'bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]',
          'fixed inset-y-0 left-0 transition-transform duration-200 md:static md:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="px-5 py-6">
          <Link href="/app" className="font-display text-xl tracking-tight text-text">
            Ultra<span className="text-gold">thing</span>
          </Link>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gold opacity-80">
            Studio
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4" aria-label="Módulos">
          {features.map((f) => {
            const active = pathname === f.route || pathname.startsWith(`${f.route}/`);
            return (
              <Link
                key={f.id}
                href={f.route}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'relative rounded-lg px-3 py-2 text-sm transition-all',
                  active
                    ? 'bg-[var(--glass-strong)] text-gold shadow-[inset_2px_0_0_var(--gold),var(--glow-gold)]'
                    : 'text-text-muted hover:bg-[var(--glass-strong)] hover:text-text',
                )}
              >
                {f.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 backdrop-blur-[var(--glass-blur)] md:px-8 md:py-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="rounded p-1 text-text-muted transition-colors hover:text-gold md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="max-w-[45vw] truncate text-sm text-text-faint">{session.user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                router.replace('/');
              }}
            >
              Salir
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <EngineBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
