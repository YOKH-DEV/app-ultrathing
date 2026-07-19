import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
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

/** Lo que devuelve el job del downloader al terminar (result). */
interface DownloadDone {
  title: string;
  filepath: string;
  ext: string;
}

type Phase = 'idle' | 'downloading' | 'processing' | 'done' | 'error';

/** Descarga rápida: elige carpeta, formato y calidad; barra real y ruta del archivo. */
export function DownloaderPage() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<DownloadFormat>('mp4');
  const [quality, setQuality] = useState<DownloadQuality>('mejor');
  const [dest, setDest] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ folder: string; filename: string } | null>(null);
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

  async function chooseFolder() {
    const picked = await open({ directory: true, title: 'Elegir carpeta de descarga' });
    if (typeof picked === 'string') setDest(picked);
  }

  async function handleDownload() {
    setPhase('downloading');
    setProgress(0);
    setError(null);
    setSaved(null);
    try {
      const { job_id } = await engineClient.downloader.start(
        url,
        format,
        quality,
        dest ?? undefined,
      );
      const stop = streamJob(job_id, (job) => {
        setProgress(job.progress);
        // Tras bajar al 100%, ffmpeg convierte/une: el job sigue "running" un rato.
        if (job.status === 'running') setPhase(job.progress >= 99 ? 'processing' : 'downloading');
        if (job.status === 'error') {
          setError(job.error ?? 'La descarga falló.');
          setPhase('error');
          stop();
        }
        if (job.status === 'done') {
          stop();
          const r = job.result as DownloadDone | null;
          if (r?.filepath) {
            const i = r.filepath.lastIndexOf('/');
            setSaved({ folder: r.filepath.slice(0, i), filename: r.filepath.slice(i + 1) });
          }
          setProgress(100);
          setPhase('done');
          void refreshHistory();
        }
      });
    } catch {
      setError('No se pudo conectar con el motor.');
      setPhase('error');
    }
  }

  async function handleClear() {
    await engineClient.downloader.clearHistory();
    void refreshHistory();
  }

  const busy = phase === 'downloading' || phase === 'processing';

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
          <Button onClick={handleDownload} disabled={!url.trim() || busy}>
            {busy ? 'Descargando…' : 'Descargar'}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
          <Button variant="ghost" size="sm" onClick={chooseFolder}>
            Elegir carpeta
          </Button>
          <span className="truncate text-xs text-text-faint" title={dest ?? ''}>
            {dest ?? 'Carpeta por defecto (~/Ultrathing)'}
          </span>
        </div>

        {/* Barra de progreso real */}
        {phase !== 'idle' && phase !== 'error' && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-text-muted">
              <span>
                {phase === 'downloading' && 'Descargando…'}
                {phase === 'processing' && 'Procesando el archivo (convirtiendo/uniendo)…'}
                {phase === 'done' && '✓ Descarga completa'}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-elevated">
              <div
                className={`h-full transition-all ${phase === 'done' ? 'bg-[var(--success)]' : 'bg-gold'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Confirmación con ruta local + abrir carpeta */}
        {phase === 'done' && saved && (
          <div className="mt-3 rounded border border-line bg-elevated p-3 text-sm">
            <p className="text-text">
              <span className="text-[var(--success)]">✓ Guardado:</span> {saved.filename}
            </p>
            <p className="mt-1 break-all text-xs text-text-muted">En: {saved.folder}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void openPath(saved.folder)}
              className="mt-2"
            >
              Abrir carpeta
            </Button>
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
