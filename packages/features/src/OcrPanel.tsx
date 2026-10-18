'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@ultrathing/ui';
import { engineClient } from '@ultrathing/api-client';

/** True si corremos dentro del webview de Tauri (escritorio). */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Lee una imagen del portapapeles NATIVO del sistema vía el plugin de Tauri.
 * En WebKitGTK (Linux) `navigator.clipboard.read()` no entrega imágenes, así que
 * en escritorio hay que pasar por aquí. Devuelve un PNG (Blob) o null si no hay imagen.
 */
async function readTauriClipboardImage(): Promise<Blob | null> {
  const { readImage } = await import('@tauri-apps/plugin-clipboard-manager');
  const image = await readImage();
  const { width, height } = await image.size();
  const rgba = await image.rgba();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/**
 * Imagen → texto (OCR). Componente único compartido (surface: both). Aceptas una
 * imagen por: elegir archivo, pegar un pantallazo (Ctrl+V) o arrastrarla. El motor
 * (Tesseract, local) detecta el texto. Layout: imagen mediana a la izquierda
 * (clic → se abre completa) y la transcripción, editable, a la derecha.
 */
export function OcrPanel() {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function process(blob: Blob) {
    setLoading(true);
    setError(null);
    setCopied(false);
    setText('');
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

  // Quitar la imagen cargada y volver al estado inicial (para subir otra).
  function clear() {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setText('');
    setError(null);
    setCopied(false);
    setExpanded(false);
  }

  // Pegar un pantallazo desde el portapapeles (Ctrl+V) en cualquier parte del panel.
  // En navegador usamos el evento paste; en escritorio (WebKitGTK no trae la imagen
  // en el evento) interceptamos Ctrl+V y leemos el portapapeles nativo de Tauri.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith('image/'),
      );
      const file = item?.getAsFile();
      if (file) void process(file);
    }

    async function onKeyDown(e: KeyboardEvent) {
      if (!isTauri()) return;
      const isPaste = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v';
      if (!isPaste) return;
      // No robar el pegado cuando el usuario edita el texto detectado.
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) return;
      e.preventDefault();
      setError(null);
      try {
        const blob = await readTauriClipboardImage();
        if (blob) void process(blob);
        else setError('No hay ninguna imagen en el portapapeles. Copia un pantallazo primero.');
      } catch {
        setError('No hay ninguna imagen en el portapapeles. Copia un pantallazo primero.');
      }
    }

    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Cerrar la imagen ampliada con Escape.
  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Botón de pegar: en escritorio lee el portapapeles nativo de Tauri; en navegador
  // usa la API del navegador (permiso concedido en la app).
  async function pasteFromClipboard() {
    setError(null);
    try {
      if (isTauri()) {
        const blob = await readTauriClipboardImage();
        if (blob) void process(blob);
        else setError('No hay ninguna imagen en el portapapeles. Copia un pantallazo primero.');
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) {
          void process(await item.getType(type));
          return;
        }
      }
      setError('No hay ninguna imagen en el portapapeles. Copia un pantallazo primero.');
    } catch {
      setError('No se pudo leer el portapapeles. Prueba arrastrar o elegir el archivo.');
    }
  }

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
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={pasteFromClipboard}>
            📋 Pegar pantallazo
          </Button>
          {preview && (
            <Button variant="ghost" size="sm" onClick={clear}>
              🗑️ Quitar imagen
            </Button>
          )}
        </div>

        {/* Zona de carga como <label>: el clic dispara el input de archivo con un
            gesto de usuario real (el clic programático sobre un input oculto no abre
            el diálogo en el webview de escritorio). */}
        <label
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
          className={`flex cursor-pointer flex-col items-center justify-center rounded border border-dashed p-6 text-center transition-colors ${
            dragging ? 'border-gold bg-[var(--gold-glow)]' : 'border-line bg-elevated'
          }`}
        >
          <p className="text-sm text-text">
            {preview ? 'Haz clic para cambiar la imagen' : 'Haz clic aquí para elegir una imagen'}
          </p>
          <p className="mt-1 text-xs text-text-faint">
            o arrástrala aquí · o usa “Pegar pantallazo”
          </p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void process(file);
              e.target.value = '';
            }}
          />
        </label>

        {loading && <p className="mt-3 text-sm text-text-muted">Detectando texto…</p>}
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

        {/* Resultado: imagen (izquierda) + transcripción (derecha). Se apila en angosto. */}
        {preview && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Imagen mediana, clic → se abre completa */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-text-muted">Imagen</span>
                <button
                  type="button"
                  onClick={clear}
                  title="Quitar imagen"
                  className="rounded p-1 text-text-faint transition-colors hover:bg-hover hover:text-[var(--danger)]"
                >
                  🗑️
                </button>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                title="Clic para ver completa"
                className="group relative block w-full cursor-zoom-in overflow-hidden rounded border border-line bg-elevated"
              >
                <img
                  src={preview}
                  alt="Vista previa"
                  className="h-64 w-full object-contain"
                />
                <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  🔍 Ver completa
                </span>
              </button>
            </div>

            {/* Transcripción editable */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-text-muted">Texto detectado</span>
                {text && (
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? 'Copiado ✓' : 'Copiar'}
                  </Button>
                )}
              </div>
              <textarea
                value={text}
                placeholder={loading ? 'Detectando texto…' : 'Aquí saldrá el texto detectado.'}
                onChange={(e) => {
                  setText(e.target.value);
                  setCopied(false);
                }}
                className="h-64 w-full resize-y overflow-auto whitespace-pre-wrap break-words rounded border border-line bg-elevated p-3 text-sm leading-relaxed text-text outline-none focus:border-gold"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Lightbox: imagen a tamaño completo. Clic fuera o Esc para cerrar. */}
      {expanded && preview && (
        <div
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
        >
          <img
            src={preview}
            alt="Imagen completa"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded border border-line object-contain"
          />
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-4 top-4 rounded bg-black/60 px-3 py-1 text-sm text-white hover:bg-black/80"
          >
            Cerrar ✕
          </button>
        </div>
      )}
    </div>
  );
}
