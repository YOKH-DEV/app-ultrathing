'use client';

import { useSession } from '@ultrathing/api-client';
import { WebLogin } from './login';
import { Dashboard } from './dashboard';

// La web es un dashboard de solo lectura: muestra datos, no ejecuta trabajo pesado.
export default function Page() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-base">
        <p className="text-sm text-text-muted">Cargando…</p>
      </main>
    );
  }
  if (!session) return <WebLogin />;
  return <Dashboard session={session} />;
}
