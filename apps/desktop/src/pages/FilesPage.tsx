import { useRef, useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { engineClient, streamJob } from '@ultrathing/api-client';

type Result = { title: string; filepath: string; ext: string; rows: number; tables: number };

/** PDF con tablas → CSV. Mismo flujo que Imagen: job + progreso + persistencia. */
export function FilesPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleConvert() {
    if (!file) return;
    setProgress(0);
    setError(null);
    setResult(null);
    try {
      const { job_id } = await engineClient.files.pdfToCsv(file);
      const stop = streamJob(job_id, (job) => {
        setProgress(job.progress);
        if (job.status === 'error') setError(job.error ?? 'No se pudo convertir el PDF.');
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
      <h2 className="mb-1 font-display text-2xl text-text">Archivos</h2>
      <p className="mb-6 text-sm text-text-muted">Convierte un PDF con tablas a CSV.</p>

      <Card>
        <p className="mb-3 font-display text-text">PDF → CSV</p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setProgress(null);
              setError(null);
            }}
          />
          <Button variant="ghost" onClick={() => inputRef.current?.click()}>
            {file ? 'Cambiar PDF' : 'Elegir PDF'}
          </Button>
          {file && <span className="truncate text-sm text-text-muted">{file.name}</span>}
          <Button className="ml-auto" onClick={handleConvert} disabled={!file}>
            Convertir
          </Button>
        </div>

        {progress !== null && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-elevated">
            <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {result && (
          <p className="mt-3 text-sm text-text-muted">
            {result.tables} tabla(s), {result.rows} filas →{' '}
            <span className="text-gold">{result.filepath}</span>
          </p>
        )}
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </Card>
    </div>
  );
}
