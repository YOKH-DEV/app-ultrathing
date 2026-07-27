import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { featuresFor } from '@ultrathing/core';
import { useSession, type Session } from '@ultrathing/api-client';
import { LoginScreen } from './auth/LoginScreen';
import { Layout } from './shell/Layout';
import { ComingSoon } from './pages/ComingSoon';
import { pageByRoute } from './pages';
import './features';

// El editor del studio arrastra tldraw (~1.6MB): se carga sólo al abrir un diseño,
// así el arranque de la app no paga ese peso.
const DesignEditor = lazy(() =>
  import('./pages/DesignEditor').then((m) => ({ default: m.DesignEditor })),
);

// Auth real activo: cada usuario entra o crea su cuenta y trabaja en su propia sesión.
const SKIP_AUTH_DURING_DEV = false;

export default function App() {
  const { session, loading } = useSession();

  if (loading && !SKIP_AUTH_DURING_DEV) {
    return (
      <main className="grid min-h-screen place-items-center bg-base">
        <p className="text-sm text-text-muted">Cargando…</p>
      </main>
    );
  }
  if (!session && !SKIP_AUTH_DURING_DEV) return <LoginScreen />;
  return <Shell session={session} />;
}

function Shell({ session }: { session: Session | null }) {
  const features = featuresFor('desktop');
  const home = features[0]?.route ?? '/';

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout session={session} />}>
          {features.map((f) => {
            const Page = pageByRoute[f.route];
            return (
              <Route
                key={f.id}
                path={f.route}
                element={Page ? <Page /> : <ComingSoon feature={f} />}
              />
            );
          })}
          <Route
            path="/diseno/:id"
            element={
              <Suspense fallback={<p className="text-sm text-text-muted">Abriendo el studio…</p>}>
                <DesignEditor />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to={home} replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
