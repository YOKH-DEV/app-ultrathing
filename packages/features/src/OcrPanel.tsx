'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { engineClient } from '@ultrathing/api-client';

/**
 * Imagen → texto (OCR). Componente único compartido (surface: both). Aceptas una
 * imagen por: elegir archivo, pegar un pantallazo (Ctrl+V) o arrastrarla. El motor
 * (Tesseract, local) detecta el texto y lo muestra editable, con botón de copiar.
 */
export function OcrPanel() {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function process(blob: Blob) {
    setLoading(true);
    setError(null);
    setCopied(false);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
    try {
      const { text: detected } = await engineClient.ocr.extract(blob);
      if (!detected) setError('No se detectó texto en la imagen.');
      setText(detected);
    } catch {
      setError('No se pudo procesar la imagen. Revisa que el motor esté activo.');
    } finally {
      setLoading(false);
    }
  }

  // Pegar un pantallazo desde el portapapeles (Ctrl+V) en cualquier parte del panel.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith('image/'),
      );
      const file = item?.getAsFile();
      if (file) void process(file);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  async function handleCopy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-text">Imagen a texto</h2>
      <p className="mb-6 text-sm text-text-muted">
        Sube una imagen o pega un pantallazo y extrae todo su texto.
      </p>

      <Card>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith('image/')) void process(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded border border-dashed p-8 text-center transition-colors ${
            dragging ? 'border-gold bg-[var(--gold-glow)]' : 'border-line bg-elevated'
          }`}
        >
          <p className="text-sm text-text">Arrastra una imagen aquí, o haz clic para elegir</p>
          <p className="mt-1 text-xs text-text-faint">
            También puedes pegar un pantallazo con Ctrl+V
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void process(file);
              e.target.value = '';
            }}
          />
        </div>

        {loading && <p className="mt-3 text-sm text-text-muted">Detectando texto…</p>}
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

        {preview && (
          <img
            src={preview}
            alt="Vista previa"
            className="mt-4 max-h-40 rounded border border-line object-contain"
          />
        )}

        {text && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-text-muted">Texto detectado</span>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? 'Copiado ✓' : 'Copiar'}
              </Button>
            </div>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setCopied(false);
              }}
              className="h-56 w-full resize-y overflow-auto whitespace-pre-wrap break-words rounded border border-line bg-elevated p-3 text-sm leading-relaxed text-text outline-none focus:border-gold"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
