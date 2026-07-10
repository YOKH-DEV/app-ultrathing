import { Outlet } from 'react-router-dom';
import { Button } from '@ultrathing/ui';
import { signOut, type Session } from '@ultrathing/api-client';
import { Sidebar } from './Sidebar';

/** Marco de la app: sidebar fijo + área de contenido con header de sesión. */
export function Layout({ session }: { session: Session | null }) {
  return (
    <div className="flex min-h-screen bg-base">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-line px-8 py-4">
          {session && (
            <>
              <span className="text-sm text-text-faint">{session.user.email}</span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Salir
              </Button>
            </>
          )}
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
