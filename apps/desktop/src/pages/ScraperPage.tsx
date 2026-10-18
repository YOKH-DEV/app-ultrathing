import { useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { engineClient, streamJob } from '@ultrathing/api-client';

type Lead = { name: string | null; phone: string | null; email: string | null; website: string | null };
type Result = { source: string; count: number; leads: Lead[] };

/** Extrae leads (nombre/teléfono/email/web) de un directorio público. Job + progreso. */
export function ScraperPage() {
  const [url, setUrl] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleScrape() {
    if (!url.trim()) return;
    setProgress(0);
    setError(null);
    setResult(null);
    try {
      const { job_id } = await engineClient.scraper.start(url);
      const stop = streamJob(job_id, (job) => {
        setProgress(job.progress);
        if (job.status === 'error') setError(job.error ?? 'No se pudieron extraer leads.');
        if (job.status === 'done') setResult(job.result as Result);
        if (job.status === 'done' || job.status === 'error') stop();
      });
    } catch {
      setProgress(null);
      setError('No se pudo conectar con el motor.');
    }
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-text">Scraper</h2>
      <p className="mb-6 text-sm text-text-muted">Extrae leads desde un directorio de la web.</p>

      <Card>
        <p className="mb-3 font-display text-text">Extraer leads</p>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega la URL de un listado público…"
            className="h-10 flex-1 rounded border border-line bg-elevated px-3 text-sm text-text outline-none focus:border-gold"
          />
          <Button onClick={handleScrape} disabled={!url.trim()}>
            Extraer
          </Button>
        </div>

        {progress !== null && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-elevated">
            <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </Card>

      {result && (
        <Card className="mt-4">
          <p className="mb-3 font-display text-text">
            {result.count} {result.count === 1 ? 'lead' : 'leads'} encontrados
          </p>
          {result.count === 0 ? (
            <p className="text-sm text-text-muted">No se hallaron contactos en esta página.</p>
          ) : (
            <ul className="divide-y divide-line">
              {result.leads.map((lead, i) => (
                <li key={i} className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-sm">
                  <span className="min-w-40 text-text">{lead.name ?? '—'}</span>
                  {lead.email && <span className="text-gold">{lead.email}</span>}
                  {lead.phone && <span className="text-text-muted">{lead.phone}</span>}
                  {lead.website && <span className="truncate text-text-muted">{lead.website}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
