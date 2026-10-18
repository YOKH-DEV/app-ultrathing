'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import {
  engineClient,
  streamJob,
  useSession,
  type DownloadFormat,
  type DownloadHistoryItem,
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
  'h-10 cursor-pointer rounded border border-[var(--gold-deep)] bg-gold px-3 text-sm font-medium text-[var(--on-gold)] outline-none';

type Phase = 'idle' | 'downloading' | 'processing' | 'done' | 'error';

export default function DescargasPage() {
  const { session } = useSession();
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<DownloadFormat>('mp4');
  const [quality, setQuality] = useState<DownloadQuality>('mejor');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);

  async function refreshHistory() {
    try {
      setHistory(await engineClient.downloader.history());
    } catch {
      /* motor apagado */
    }
  }

  useEffect(() => {
    void refreshHistory();
  }, [session?.user.id]);

  async function handleDownload() {
    setPhase('downloading');
    setProgress(0);
    setError(null);
    setSaved(null);
    try {
      const { job_id } = await engineClient.downloader.start(url, format, quality);
      const stop = streamJob(job_id, (job) => {
        setProgress(job.progress);
        if (job.status === 'running') setPhase(job.progress >= 99 ? 'processing' : 'downloading');
        if (job.status === 'error') {
          setError(job.error ?? 'La descarga falló.');
          setPhase('error');
          stop();
        }
        if (job.status === 'done') {
          stop();
          const r = job.result as { filepath?: string } | null;
          setSaved(r?.filepath ?? 'listo');
          setProgress(100);
          setPhase('done');
          void refreshHistory();
        }
      });
    } catch {
      setError('No se pudo conectar con el motor. Levantá `pnpm engine`.');
      setPhase('error');
    }
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl">Descargas</h2>
      <p className="mb-6 text-sm text-text-muted">
        Pegá una URL. El archivo queda en tu disco (`~/Ultrathing`).
      </p>
      <Card>
        <div className="flex flex-col gap-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="h-10 rounded border border-line bg-elevated px-3 text-sm text-text outline-none focus:border-gold"
          />
          <div className="flex flex-wrap gap-2">
            <select value={format} onChange={(e) => setFormat(e.target.value as DownloadFormat)} className={selectClass}>
              <option value="mp4">MP4</option>
              <option value="mp3">MP3</option>
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
            <Button onClick={handleDownload} disabled={!url.trim() || phase === 'downloading' || phase === 'processing'}>
              {phase === 'downloading' || phase === 'processing' ? `${Math.round(progress)}%` : 'Descargar'}
            </Button>
          </div>
          {progress > 0 && (
            <div className="h-1.5 overflow-hidden rounded bg-elevated">
              <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {saved && <p className="text-sm text-gold">{saved}</p>}
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </div>
      </Card>
      {history.length > 0 && (
        <ul className="mt-6 space-y-2 text-sm text-text-muted">
          {history.slice(0, 8).map((item, i) => (
            <li key={`${item.at}-${i}`}>
              {item.title} · {item.format}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
