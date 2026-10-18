'use client';

import { useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { engineClient, type CopyFormat, type CopyTone } from '@ultrathing/api-client';

const TONES: { value: CopyTone; label: string }[] = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'cercano', label: 'Cercano' },
  { value: 'persuasivo', label: 'Persuasivo' },
  { value: 'divertido', label: 'Divertido' },
];

const FORMATS: { value: CopyFormat; label: string }[] = [
  { value: 'post', label: 'Post redes' },
  { value: 'anuncio', label: 'Anuncio' },
  { value: 'email', label: 'Email' },
  { value: 'titulares', label: 'Titulares' },
];

const selectClass =
  'h-10 cursor-pointer rounded border border-[var(--gold-deep)] bg-gold px-3 text-sm font-medium text-[var(--on-gold)] outline-none focus:border-[var(--gold-bright)]';

/**
 * Copywriter con IA. Componente ÚNICO compartido entre escritorio y web (surface: both):
 * escribes un brief, eliges tono y formato, y el motor lo genera con la API de IA.
 */
export function CopywriterPanel() {
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState<CopyTone>('profesional');
  const [format, setFormat] = useState<CopyFormat>('post');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const { text } = await engineClient.copywriter.generate(brief, tone, format);
      setResult(text);
    } catch {
      setError('No se pudo generar el copy. Revisa que el motor y la clave de IA estén activos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-text">Copywriter</h2>
      <p className="mb-6 text-sm text-text-muted">Genera copy de marketing con IA.</p>

      <Card>
        <label className="mb-2 block font-display text-text">¿Sobre qué escribimos?</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Ej: lanzamiento de una app de finanzas para jóvenes, promo de fin de mes…"
          rows={3}
          className="mb-3 w-full resize-y rounded border border-line bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-gold"
        />

        <div className="mb-3 flex flex-wrap gap-2">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as CopyTone)}
            className={selectClass}
          >
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                Tono: {t.label}
              </option>
            ))}
          </select>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as CopyFormat)}
            className={selectClass}
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <Button onClick={handleGenerate} disabled={loading || !brief.trim()}>
            {loading ? 'Generando…' : 'Generar copy'}
          </Button>
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        {result && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-text-muted">Resultado</span>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? 'Copiado ✓' : 'Copiar'}
              </Button>
            </div>
            <pre className="whitespace-pre-wrap rounded border border-line bg-elevated p-3 font-sans text-sm text-text">
              {result}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}
