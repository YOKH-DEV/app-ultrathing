import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@ultrathing/ui';
import {
  getDesign,
  updateDesign,
  engineClient,
  streamJob,
  type Design,
  type TraceResult,
  type RewriteAction,
} from '@ultrathing/api-client';
import {
  Studio,
  exportPng,
  downloadBlob,
  isStudioDocument,
  traceToShapes,
  getSelectedText,
  setText,
} from '@ultrathing/studio';
import type { Editor, TLEditorSnapshot } from '@ultrathing/studio/sdk';

/** Acciones rápidas de IA sobre el texto seleccionado (label visible → acción del motor). */
const AI_ACTIONS: { action: RewriteAction; label: string }[] = [
  { action: 'acortar', label: 'Acortar' },
  { action: 'alargar', label: 'Alargar' },
  { action: 'profesional', label: 'Pro' },
  { action: 'persuasivo', label: 'Persuasivo' },
  { action: 'corregir', label: 'Corregir' },
  { action: 'traducir_en', label: 'EN' },
];

/**
 * Editor del Studio de Diseño. Monta el lienzo de `@ultrathing/studio` (tldraw tras el
 * facade), carga/guarda el documento como snapshot en `designs.elements` (jsonb, RLS del
 * usuario) con autosave, y aporta su propio cromo: volver, título, estado y export PNG.
 */
export function DesignEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [design, setDesign] = useState<Design | null>(null);
  const [title, setTitle] = useState('');
  const [snapshot, setSnapshot] = useState<TLEditorSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [exporting, setExporting] = useState(false);
  const [tracing, setTracing] = useState<number | null>(null);
  const [hasTextSel, setHasTextSel] = useState(false);
  const [aiBusy, setAiBusy] = useState<RewriteAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const traceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    getDesign(id).then((d) => {
      setDesign(d);
      setTitle(d?.title ?? '');
      // El documento viejo (konva, array de elementos) no es un snapshot del studio:
      // se ignora y se arranca en lienzo vacío. Los nuevos ya guardan snapshot.
      setSnapshot(isStudioDocument(d?.elements) ? (d?.elements as TLEditorSnapshot) : null);
      setLoading(false);
      if (!d) setError('No se pudo cargar el diseño (¿sin sesión o no existe?).');
    });
  }, [id]);

  // Autosave del documento (lo dispara el Studio, debounced).
  const handleSave = useCallback(
    async (snap: TLEditorSnapshot) => {
      if (!id) return;
      setStatus('saving');
      try {
        await updateDesign(id, { elements: snap as unknown as Design['elements'] });
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    },
    [id],
  );

  async function saveTitle() {
    if (!id || !design || title === design.title) return;
    try {
      await updateDesign(id, { title });
      setDesign({ ...design, title });
    } catch {
      setError('No se pudo guardar el título.');
    }
  }

  // Aplica una acción de IA (acortar, traducir…) al texto seleccionado, vía copywriter.
  async function applyAiAction(action: RewriteAction) {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = getSelectedText(editor);
    if (!sel) return;
    setAiBusy(action);
    setError(null);
    try {
      const { text } = await engineClient.copywriter.rewrite(sel.text, action);
      setText(editor, sel.id, text);
    } catch {
      setError('No se pudo aplicar la acción de IA (¿motor y saldo/Vertex ok?).');
    } finally {
      setAiBusy(null);
    }
  }

  // Imagen → editable: descompone una imagen (motor) y la monta como shapes editables.
  function handleTraceFile(file: File) {
    const editor = editorRef.current;
    if (!editor) return;
    setTracing(0);
    setError(null);
    engineClient.tracer
      .decompose(file)
      .then(({ job_id }) => {
        const stop = streamJob(job_id, (job) => {
          setTracing(job.progress);
          if (job.status === 'error') {
            setError(job.error ?? 'No se pudo procesar la imagen.');
            setTracing(null);
            stop();
          }
          if (job.status === 'done') {
            traceToShapes(editor, job.result as unknown as TraceResult);
            setTracing(null);
            stop();
          }
        });
      })
      .catch(() => {
        setError('No se pudo conectar con el motor.');
        setTracing(null);
      });
  }

  async function handleExport() {
    const editor = editorRef.current;
    if (!editor) return;
    setExporting(true);
    setError(null);
    try {
      const blob = await exportPng(editor);
      if (!blob) {
        setError('El lienzo está vacío: agrega algo antes de exportar.');
        return;
      }
      downloadBlob(blob, `${(title || 'diseno').replace(/[^\w.-]+/g, '_')}.png`);
    } catch {
      setError('No se pudo exportar el PNG.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <p className="text-sm text-text-muted">Cargando…</p>;
  if (!design)
    return (
      <div>
        <p className="mb-3 text-sm text-[var(--danger)]">{error ?? 'Diseño no encontrado.'}</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/diseno')}>
          ← Volver
        </Button>
      </div>
    );

  const statusLabel =
    status === 'saving'
      ? 'Guardando…'
      : status === 'saved'
        ? 'Guardado'
        : status === 'error'
          ? 'Error al guardar'
          : '';

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/diseno')}>
          ← Galería
        </Button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          className="flex-1 rounded border border-line bg-elevated px-3 py-1 text-sm text-text outline-none focus:border-gold"
        />
        <span
          className={`text-xs ${status === 'error' ? 'text-[var(--danger)]' : 'text-text-faint'}`}
        >
          {statusLabel}
        </span>
        <input
          ref={traceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleTraceFile(f);
            e.target.value = '';
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => traceInputRef.current?.click()}
          disabled={tracing !== null}
        >
          {tracing !== null ? `Procesando… ${Math.round(tracing)}%` : '✨ Imagen → editable'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exportando…' : 'Exportar PNG'}
        </Button>
      </div>

      {error && <p className="mb-2 text-sm text-[var(--danger)]">{error}</p>}

      {hasTextSel && (
        <div className="mb-2 flex items-center gap-1.5 rounded border border-line bg-elevated px-2 py-1.5">
          <span className="mr-1 text-xs text-gold">✨ IA de texto:</span>
          {AI_ACTIONS.map(({ action, label }) => (
            <Button
              key={action}
              variant="ghost"
              size="sm"
              onClick={() => applyAiAction(action)}
              disabled={aiBusy !== null}
            >
              {aiBusy === action ? '…' : label}
            </Button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded border border-line">
        <Studio
          snapshot={snapshot}
          onSave={handleSave}
          onReady={(editor) => {
            editorRef.current = editor;
            // Mostrar la barra de IA solo cuando hay un texto seleccionado.
            editor.store.listen(() => setHasTextSel(!!getSelectedText(editor)));
          }}
        />
      </div>
    </div>
  );
}
