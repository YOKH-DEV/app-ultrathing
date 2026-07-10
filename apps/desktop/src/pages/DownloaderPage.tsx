import { useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { engineClient, streamJob } from '@ultrathing/api-client';

/** Descarga rápida: pega una URL y baja video/audio. */
export function DownloaderPage() {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');

  async function handleDownload() {
    setProgress(0);
    setError(null);
    try {
      const { job_id } = await engineClient.downloader.start(url);
      const stop = streamJob(job_id, (job) => {
        setProgress(job.progress);
        if (job.status === 'error') setError(job.error ?? 'La descarga falló.');
        if (job.status === 'done' || job.status === 'error') stop();
      });
    } catch {
      setProgress(null);
      setError('No se pudo conectar con el motor.');
    }
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-text">Descargas</h2>
      <p className="mb-6 text-sm text-text-muted">Baja video o audio de cualquier fuente.</p>

      <Card>
        <p className="mb-3 font-display text-text">Descarga rápida</p>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega una URL…"
            className="h-10 flex-1 rounded border border-line bg-elevated px-3 text-sm text-text outline-none focus:border-gold"
          />
          <Button onClick={handleDownload} disabled={!url.trim()}>
            Descargar
          </Button>
        </div>
        {progress !== null && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-elevated">
            <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </Card>
    </div>
  );
}
