import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@ultrathing/ui';
import { signOut, type Session } from '@ultrathing/api-client';
import { Sidebar } from './Sidebar';

/**
 * Marco de la app: sidebar + área de contenido con header de sesión.
 * Responsivo: en escritorio el sidebar queda fijo; en pantallas chicas (celular) se
 * colapsa y se abre como panel deslizable con el botón de menú.
 */
export function Layout({ session }: { session: Session | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-[100dvh] bg-base">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 backdrop-blur-[var(--glass-blur)] md:px-8 md:py-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="rounded p-1 text-text-muted transition-colors hover:text-gold md:hidden"
          >
            <Menu size={20} />
          </button>
          {session && (
            <div className="ml-auto flex items-center gap-3">
              <span className="max-w-[45vw] truncate text-sm text-text-faint">
                {session.user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Salir
              </Button>
            </div>
          )}
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
