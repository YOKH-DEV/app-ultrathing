import { useEffect, useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import {
  engineClient,
  streamJob,
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
  'h-10 cursor-pointer rounded border border-[var(--gold-deep)] bg-gold px-3 text-sm font-medium text-[var(--on-gold)] outline-none focus:border-[var(--gold-bright)]';

function fmtDuration(s: number | null): string {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** Descarga rápida: pega una URL, elige mp3/mp4 y calidad, y baja el archivo. */
export function DownloaderPage() {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<DownloadFormat>('mp4');
  const [quality, setQuality] = useState<DownloadQuality>('mejor');
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);

  async function refreshHistory() {
    try {
      setHistory(await engineClient.downloader.history());
    } catch {
      /* si el motor no responde, dejamos el historial como está */
    }
  }

  useEffect(() => {
    void refreshHistory();
  }, []);

  async function handleDownload() {
    setProgress(0);
    setError(null);
    try {
      const { job_id } = await engineClient.downloader.start(url, format, quality);
      const stop = streamJob(job_id, (job) => {
        setProgress(job.progress);
        if (job.status === 'error') setError(job.error ?? 'La descarga falló.');
        if (job.status === 'done' || job.status === 'error') {
          stop();
          if (job.status === 'done') void refreshHistory();
        }
      });
    } catch {
      setProgress(null);
      setError('No se pudo conectar con el motor.');
    }
  }

  async function handleClear() {
    await engineClient.downloader.clearHistory();
    void refreshHistory();
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

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-text">Historial de descargas</h3>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={history.length === 0}>
            Limpiar historial
          </Button>
        </div>
        <Card>
          {history.length === 0 ? (
            <p className="text-sm text-text-faint">
              Aún no hay descargas. Lo que bajes aparecerá aquí.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-text-muted">
                    <th className="pb-2 pr-3 font-medium">Nombre</th>
                    <th className="pb-2 pr-3 font-medium">Plataforma</th>
                    <th className="pb-2 pr-3 font-medium">Formato</th>
                    <th className="pb-2 font-medium">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={`${h.at}-${i}`} className="border-t border-line text-text">
                      <td className="max-w-[22rem] truncate py-2 pr-3" title={h.title}>
                        {h.title}
                      </td>
                      <td className="py-2 pr-3 text-text-muted">{h.platform || '—'}</td>
                      <td className="py-2 pr-3 uppercase text-text-muted">{h.format}</td>
                      <td className="py-2 text-text-muted">{fmtDuration(h.duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
