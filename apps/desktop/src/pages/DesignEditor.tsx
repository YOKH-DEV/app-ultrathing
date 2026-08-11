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
  exportThumbnail,
  downloadBlob,
  isStudioDocument,
  traceToShapes,
  getSelectedText,
  setText,
  addImage,
  replaceImageSrc,
  getBackground,
  setBackground,
  clearBackground,
  addBlock,
  addImageBlocks,
  exportBlocksZip,
  exportBlocksPdf,
  canvasToTrace,
  VideoPreview,
} from '@ultrathing/studio';
import type { Editor, TLEditorSnapshot, TLImageShape } from '@ultrathing/studio/sdk';
import type { StudioTrace } from '@ultrathing/studio';
import { StudioRightPanel, StudioBlockGallery } from '../design/StudioPanels';

/** Colores de fondo a un clic (tema de la casa + los dos neutros de siempre). */
const BG_SWATCHES = ['#ffffff', '#f5efe0', '#d4af37', '#111111', '#0f172a'];

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
  const [genBrief, setGenBrief] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genImg, setGenImg] = useState(false);
  const [video, setVideo] = useState<number | null>(null);
  const [preview, setPreview] = useState<StudioTrace | null>(null);
  const [hasTextSel, setHasTextSel] = useState(false);
  const [aiBusy, setAiBusy] = useState<RewriteAction | null>(null);
  const [zoom, setZoom] = useState(1);
  const [removingBg, setRemovingBg] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showBg, setShowBg] = useState(false);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgBusy, setBgBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  // Espejo en estado del editor: los paneles (Propiedades/Capas/Galería) sólo
  // pueden montarse una vez que tldraw terminó de montar (onReady).
  const [editor, setEditor] = useState<Editor | null>(null);
  const traceInputRef = useRef<HTMLInputElement>(null);
  const uploadImagesRef = useRef<HTMLInputElement>(null);
  const bgImageRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const scrollTools = (dir: number) =>
    toolbarRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });

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
        // Junto con el documento guardamos una miniatura para la galería (vista previa).
        const editor = editorRef.current;
        const thumbnail = editor ? await exportThumbnail(editor) : null;
        await updateDesign(id, {
          elements: snap as unknown as Design['elements'],
          thumbnail,
        });
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

  // Genera una pieza entera desde un brief: la IA emite los elementos y se montan.
  async function handleGenerate() {
    const editor = editorRef.current;
    if (!editor || !genBrief.trim() || !design) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await engineClient.design.generate(genBrief, design.width, design.height);
      traceToShapes(editor, result as unknown as TraceResult);
    } catch {
      setError('No se pudo generar la pieza con IA (¿motor y Vertex ok?).');
    } finally {
      setGenerating(false);
    }
  }

  // Genera una imagen con IA desde el brief y la inserta en el lienzo.
  async function handleGenImage() {
    const editor = editorRef.current;
    if (!editor || !genBrief.trim()) return;
    setGenImg(true);
    setError(null);
    try {
      const { image } = await engineClient.imagegen.generate(genBrief);
      await addImage(editor, image);
    } catch {
      setError('No se pudo generar la imagen con IA (¿motor y Vertex ok?).');
    } finally {
      setGenImg(false);
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

  // Abre el preview animado del lienzo (misma composición que el render, sin esperar).
  function openPreview() {
    const editor = editorRef.current;
    if (!editor) return;
    const trace = canvasToTrace(editor);
    if (!trace.elements.length) {
      setError('El lienzo está vacío: agrega algo antes de previsualizar.');
      return;
    }
    setError(null);
    setPreview(trace);
  }

  // Renderiza lo que hay en el lienzo como mp4 animado (Remotion, en el motor).
  function handleVideo() {
    const editor = editorRef.current;
    if (!editor) return;
    const trace = canvasToTrace(editor);
    if (!trace.elements.length) {
      setError('El lienzo está vacío: agrega algo antes de renderizar el video.');
      return;
    }
    setVideo(0);
    setError(null);
    engineClient.video
      .render(trace.elements, '#111111', trace.width, trace.height)
      .then(({ job_id }) => {
        const stop = streamJob(job_id, (job) => {
          setVideo(job.progress);
          if (job.status === 'error') {
            setError(job.error ?? 'No se pudo renderizar el video.');
            setVideo(null);
            stop();
          }
          if (job.status === 'done') {
            setVideo(null);
            stop();
          }
        });
      })
      .catch(() => {
        setError('No se pudo conectar con el motor.');
        setVideo(null);
      });
  }

  // Quitar fondo de la imagen seleccionada en el lienzo (rembg, en el motor) y
  // reemplazarla en su mismo lugar por la versión recortada. Antes vivía en la
  // sección Imagen; ahora todo el trabajo de imagen sucede dentro del Studio.
  async function handleRemoveBg() {
    const editor = editorRef.current;
    if (!editor) return;
    const img = editor.getSelectedShapes().find((s) => s.type === 'image') as
      | TLImageShape
      | undefined;
    if (!img) {
      setError('Seleccioná una imagen del lienzo para quitarle el fondo.');
      return;
    }
    const asset = img.props.assetId ? editor.getAsset(img.props.assetId) : undefined;
    const src = asset?.props.src;
    if (!src) {
      setError('No se pudo leer la imagen seleccionada.');
      return;
    }
    setRemovingBg(true);
    setError(null);
    try {
      const blob = await fetch(src).then((r) => r.blob());
      const { image } = await engineClient.image.removeBackgroundInline(blob);
      await replaceImageSrc(editor, img.id, image);
    } catch {
      setError('No se pudo quitar el fondo (¿motor ok?).');
    } finally {
      setRemovingBg(false);
    }
  }

  // Agrega un bloque (frame) del tamaño del diseño para armar otra pieza en el tablero.
  function handleAddBlock() {
    const editor = editorRef.current;
    if (!editor || !design) return;
    addBlock(editor, design.width, design.height, 'Diseño');
  }

  // Sube varias imágenes: cada una entra como su propio bloque, en fila.
  async function handleUploadImages(files: File[]) {
    const editor = editorRef.current;
    if (!editor || !files.length) return;
    setError(null);
    try {
      await addImageBlocks(editor, files);
    } catch {
      setError('No se pudieron subir las imágenes.');
    }
  }

  // --- Fondo del lienzo ---
  // Aplica al bloque en el que se está trabajando (o a la pieza entera si todavía no hay
  // bloques). El fondo es un shape más: queda al fondo, bloqueado, y viaja solo en el
  // guardado, en la miniatura y en las descargas.

  function openBgMenu() {
    const editor = editorRef.current;
    if (editor && !showBg) {
      const current = getBackground(editor);
      if (current?.type === 'color') setBgColor(current.value);
    }
    setShowExport(false);
    setShowBg((v) => !v);
  }

  function applyBgColor(value: string) {
    const editor = editorRef.current;
    if (!editor || !design) return;
    setBgColor(value);
    setError(null);
    void setBackground(editor, { type: 'color', value }, design).catch(() =>
      setError('No se pudo aplicar el color de fondo.'),
    );
  }

  /**
   * Campo de hex a mano. Existe porque el webview de Linux (WebKitGTK) no siempre abre
   * el selector nativo de color: escribir o pegar el hex funciona en cualquier ventana.
   */
  function typeBgColor(raw: string) {
    const value = raw && !raw.startsWith('#') ? `#${raw}` : raw;
    setBgColor(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) applyBgColor(value);
  }

  async function applyBgImage(file: File) {
    const editor = editorRef.current;
    if (!editor || !design) return;
    setBgBusy(true);
    setError(null);
    try {
      await setBackground(editor, { type: 'image', value: file }, design);
      setShowBg(false);
    } catch {
      setError('No se pudo poner la imagen de fondo.');
    } finally {
      setBgBusy(false);
    }
  }

  function removeBg() {
    const editor = editorRef.current;
    if (!editor) return;
    setShowBg(false);
    if (!clearBackground(editor)) setError('Esta pieza no tiene fondo puesto.');
  }

  const safeName = (title || 'disenos').replace(/[^\w.-]+/g, '_');

  async function handleExport() {
    setShowExport(false);
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
      downloadBlob(blob, `${safeName}.png`);
    } catch {
      setError('No se pudo exportar el PNG.');
    } finally {
      setExporting(false);
    }
  }

  // "Por diseños": cada bloque como PNG suelto, en un ZIP.
  async function handleExportZip() {
    setShowExport(false);
    const editor = editorRef.current;
    if (!editor) return;
    setExporting(true);
    setError(null);
    try {
      const blob = await exportBlocksZip(editor);
      if (!blob) {
        setError('No hay bloques en el tablero. Agregá bloques con "+ Bloque" o usá "Diseño actual".');
        return;
      }
      downloadBlob(blob, `${safeName}.zip`);
    } catch {
      setError('No se pudo exportar el ZIP.');
    } finally {
      setExporting(false);
    }
  }

  // "Por hojas": un PDF con cada bloque en su propia hoja.
  async function handleExportPdf() {
    setShowExport(false);
    const editor = editorRef.current;
    if (!editor) return;
    setExporting(true);
    setError(null);
    try {
      const blob = await exportBlocksPdf(editor);
      if (!blob) {
        setError('No hay bloques en el tablero. Agregá bloques con "+ Bloque".');
        return;
      }
      downloadBlob(blob, `${safeName}.pdf`);
    } catch {
      setError('No se pudo exportar el PDF.');
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
    <div className="flex h-[calc(100dvh-9rem)] flex-col md:h-[calc(100vh-7rem)]">
      <div className="mb-3 flex flex-wrap items-center gap-2 md:gap-3">
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
      </div>

      {/* Barra de herramientas deslizable: las flechas ‹ › recorren todas las opciones
          cuando no entran a la vista (pantallas chicas o celular). */}
      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => scrollTools(-1)}
          aria-label="Ver opciones anteriores"
          className="shrink-0 rounded px-1.5 py-1 text-xl leading-none text-text-muted transition-colors hover:text-gold"
        >
          ‹
        </button>
        <div
          ref={toolbarRef}
          className="flex items-center gap-2 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [&>*]:shrink-0"
        >
        <input
          ref={uploadImagesRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) handleUploadImages(files);
            e.target.value = '';
          }}
        />
        <Button variant="ghost" size="sm" onClick={handleAddBlock}>
          + Bloque
        </Button>
        <Button variant="ghost" size="sm" onClick={() => uploadImagesRef.current?.click()}>
          ⬆ Subir imágenes
        </Button>
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
        <Button variant="ghost" size="sm" onClick={handleRemoveBg} disabled={removingBg}>
          {removingBg ? 'Quitando…' : '✂️ Quitar fondo'}
        </Button>
        {/* Fondo del lienzo: color plano o imagen, detrás de todo lo demás. */}
        <input
          ref={bgImageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) applyBgImage(f);
            e.target.value = '';
          }}
        />
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={openBgMenu} disabled={bgBusy}>
            {bgBusy ? 'Aplicando…' : '🎨 Fondo ▾'}
          </Button>
          {showBg && (
            <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded border border-line bg-elevated p-2 shadow-lg">
              <p className="mb-1.5 px-1 text-xs text-text-faint">Color</p>
              <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => applyBgColor(e.target.value)}
                  aria-label="Color de fondo"
                  className="h-7 w-9 cursor-pointer rounded border border-line bg-base"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => typeBgColor(e.target.value.trim())}
                  spellCheck={false}
                  maxLength={7}
                  aria-label="Color de fondo en hex"
                  className="w-[4.5rem] rounded border border-line bg-base px-1.5 py-1 font-mono text-xs text-text outline-none focus:border-gold"
                />
                {BG_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    aria-label={`Fondo ${c}`}
                    onClick={() => applyBgColor(c)}
                    style={{ backgroundColor: c }}
                    className="h-6 w-6 rounded border border-line transition-transform hover:scale-110"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => bgImageRef.current?.click()}
                className="block w-full rounded px-3 py-1.5 text-left text-sm text-text hover:bg-base"
              >
                🖼️ Imagen de fondo…
              </button>
              <button
                type="button"
                onClick={removeBg}
                className="block w-full rounded px-3 py-1.5 text-left text-sm text-text-muted hover:bg-base"
              >
                Quitar fondo del lienzo
              </button>
            </div>
          )}
        </div>
        {/* Zoom: acercar/alejar para detallar. El % ajusta a la vista al hacer clic. */}
        <div className="flex items-center gap-0.5 rounded border border-line px-0.5">
          <Button variant="ghost" size="sm" onClick={() => editorRef.current?.zoomOut()}>
            −
          </Button>
          <button
            type="button"
            onClick={() => editorRef.current?.zoomToFit({ animation: { duration: 150 } })}
            title="Ajustar a la vista"
            className="min-w-[3rem] text-xs text-text-muted transition-colors hover:text-gold"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button variant="ghost" size="sm" onClick={() => editorRef.current?.zoomIn()}>
            +
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={openPreview}>
          ▶ Preview
        </Button>
        <Button variant="ghost" size="sm" onClick={handleVideo} disabled={video !== null}>
          {video !== null ? `Video… ${Math.round(video)}%` : '🎬 Video'}
        </Button>
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowBg(false);
              setShowExport((v) => !v);
            }}
            disabled={exporting}
          >
            {exporting ? 'Exportando…' : '⬇ Descargar ▾'}
          </Button>
          {showExport && (
            <div className="absolute right-0 top-full z-30 mt-1 w-60 rounded border border-line bg-elevated p-1 shadow-lg">
              <button
                type="button"
                onClick={handleExport}
                className="block w-full rounded px-3 py-1.5 text-left text-sm text-text hover:bg-base"
              >
                Diseño actual (PNG)
              </button>
              <button
                type="button"
                onClick={handleExportZip}
                className="block w-full rounded px-3 py-1.5 text-left text-sm text-text hover:bg-base"
              >
                Por diseños — PNG en ZIP
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="block w-full rounded px-3 py-1.5 text-left text-sm text-text hover:bg-base"
              >
                Por hojas — PDF
              </button>
            </div>
          )}
        </div>
        </div>
        <button
          type="button"
          onClick={() => scrollTools(1)}
          aria-label="Ver más opciones"
          className="shrink-0 rounded px-1.5 py-1 text-xl leading-none text-text-muted transition-colors hover:text-gold"
        >
          ›
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gold">✨ Generar pieza:</span>
        <input
          value={genBrief}
          onChange={(e) => setGenBrief(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="Describe la pieza (ej: promo 50% OFF de una cafetería)…"
          className="flex-1 rounded border border-line bg-elevated px-3 py-1 text-sm text-text outline-none focus:border-gold"
        />
        <Button size="sm" onClick={handleGenerate} disabled={generating || genImg || !genBrief.trim()}>
          {generating ? 'Generando…' : 'Generar pieza'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenImage}
          disabled={genImg || generating || !genBrief.trim()}
        >
          {genImg ? 'Imagen…' : '🖼️ Imagen'}
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

      {preview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-8"
          onClick={() => setPreview(null)}
          role="presentation"
        >
          <div
            className="flex max-h-full flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gold">▶ Preview del video</span>
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                Cerrar ✕
              </Button>
            </div>
            <div className="h-[70vh] w-[70vw] overflow-hidden rounded border border-line bg-base">
              <VideoPreview
                elements={preview.elements}
                width={preview.width}
                height={preview.height}
              />
            </div>
          </div>
        </div>
      )}

      {/* Lienzo flexible + panel derecho fijo (Propiedades/Capas). En <lg el panel
          se oculta (hidden lg:flex dentro de StudioRightPanel) y el lienzo ocupa todo. */}
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-h-0 flex-1 overflow-hidden rounded border border-line">
          <Studio
            snapshot={snapshot}
            onSave={handleSave}
            onReady={(ed) => {
              editorRef.current = ed;
              setEditor(ed);
              setZoom(ed.getZoomLevel());
              // Reaccionar a la selección (barra de IA) y a la cámara (indicador de zoom).
              ed.store.listen(() => {
                setHasTextSel(!!getSelectedText(ed));
                setZoom(ed.getZoomLevel());
              });
            }}
          />
        </div>
        <StudioRightPanel editor={editor} />
      </div>

      {/* Galería inferior: miniaturas de los bloques del tablero. */}
      <StudioBlockGallery editor={editor} />
    </div>
  );
}
