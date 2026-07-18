import { useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import {
  engineClient,
  streamJob,
  type DownloadFormat,
  type DownloadQuality,
} from '@ultrathing/api-client';

const QUALITIES: { value: DownloadQuality; label: string }[] = [
  { value: 'mejor', label: 'Mejor disponible' },
  { value: '2160', label: '4K (2160p)' },
  { value: '1440', label: '1440p' },
  { value: '1080', label: '1080p' },
  { value: '720', label: '720p' },
];

const selectClass =
  'h-10 rounded border border-line bg-elevated px-3 text-sm text-text outline-none focus:border-gold';

/** Descarga rápida: pega una URL, elige mp3/mp4 y calidad, y baja el archivo. */
export function DownloaderPage() {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<DownloadFormat>('mp4');
  const [quality, setQuality] = useState<DownloadQuality>('mejor');

  async function handleDownload() {
    setProgress(0);
    setError(null);
    try {
      const { job_id } = await engineClient.downloader.start(url, format, quality);
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

        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as DownloadFormat)}
            className={selectClass}
          >
            <option value="mp4">Video (MP4)</option>
            <option value="mp3">Audio (MP3)</option>
          </select>
          {format === 'mp4' && (
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as DownloadQuality)}
              className={selectClass}
            >
              {QUALITIES.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          )}
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
