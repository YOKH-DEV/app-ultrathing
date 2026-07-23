import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@ultrathing/ui';
import { getDesign, updateDesign, type Design } from '@ultrathing/api-client';
import { Studio, exportPng, downloadBlob, isStudioDocument } from '@ultrathing/studio';
import type { Editor, TLEditorSnapshot } from '@ultrathing/studio/sdk';

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
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);

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
        <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exportando…' : 'Exportar PNG'}
        </Button>
      </div>

      {error && <p className="mb-2 text-sm text-[var(--danger)]">{error}</p>}

      <div className="min-h-0 flex-1 overflow-hidden rounded border border-line">
        <Studio
          snapshot={snapshot}
          onSave={handleSave}
          onReady={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>
    </div>
  );
}
