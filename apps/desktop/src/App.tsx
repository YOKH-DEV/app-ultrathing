import { useState } from 'react';
import { ModuleCard, Button, Card } from '@ultrathing/ui';
import { featuresFor } from '@ultrathing/core';
import {
  engineClient,
  streamJob,
  signOut,
  useSession,
  type Session,
} from '@ultrathing/api-client';
import { LoginScreen } from './auth/LoginScreen';
import './features';

// Bypass temporal de auth mientras se construyen los módulos — reactivar antes de shipear.
const SKIP_AUTH_DURING_DEV = true;

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
  return <Dashboard session={session} />;
}

function Dashboard({ session }: { session: Session | null }) {
  const features = featuresFor('desktop');
  const [progress, setProgress] = useState<number | null>(null);
  const [url, setUrl] = useState('');

  async function handleDownload() {
    setProgress(0);
    const { job_id } = await engineClient.downloader.start(url);
    const stop = streamJob(job_id, (job) => {
      setProgress(job.progress);
      if (job.status === 'done' || job.status === 'error') stop();
    });
  }

  return (
    <main className="min-h-screen bg-base p-8">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-text">
            Ultra<span className="text-gold">thing</span>
          </h1>
          <p className="text-sm text-text-muted">Tu centro de comando de marketing.</p>
        </div>
        {session && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-faint">{session.user.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Salir
            </Button>
          </div>
        )}
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {features.map((f) => (
          <ModuleCard key={f.id} icon={f.icon} title={f.name} description={f.description} />
        ))}
      </section>

      <Card className="mt-8">
        <p className="mb-3 font-display text-text">Descarga rápida</p>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega una URL…"
            className="h-10 flex-1 rounded border border-line bg-elevated px-3 text-sm text-text outline-none focus:border-gold"
          />
          <Button onClick={handleDownload}>Descargar</Button>
        </div>
        {progress !== null && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-elevated">
            <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </Card>
    </main>
  );
}
