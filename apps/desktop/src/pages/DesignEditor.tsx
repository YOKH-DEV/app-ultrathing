import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type Konva from 'konva';
import { Button } from '@ultrathing/ui';
import {
  getDesign,
  updateDesign,
  engineClient,
  type Design,
} from '@ultrathing/api-client';
import type {
  DesignElement,
  DesignBackground,
  TextElementProps,
  ImageElementProps,
  ShapeElementProps,
  ShapeVariant,
} from '@ultrathing/core';
import { Canvas } from '../design/Canvas';
import { Toolbar } from '../design/Toolbar';
import { PropertiesPanel } from '../design/PropertiesPanel';
import { BackgroundPanel } from '../design/BackgroundPanel';
import { savePng, stageToPngDataUrl } from '../design/export';

/** Crea un elemento de texto centrado en el lienzo. */
function newTextElement(canvasW: number, canvasH: number, zIndex: number): DesignElement {
  const width = Math.min(400, Math.round(canvasW * 0.6));
  const props: TextElementProps = {
    text: 'Escribe aquí',
    fontSize: Math.max(24, Math.round(canvasW / 20)),
    fontFamily: 'Inter',
    fill: '#111111',
    fontStyle: 'normal',
    align: 'left',
  };
  return {
    id: crypto.randomUUID(),
    type: 'text',
    x: Math.round((canvasW - width) / 2),
    y: Math.round(canvasH / 2 - 40),
    width,
    height: 0, // el texto crece con su contenido
    rotation: 0,
    opacity: 1,
    zIndex,
    props: props as unknown as Record<string, unknown>,
  };
}

/** Crea un elemento de imagen escalado para caber en el lienzo, centrado. */
function newImageElement(
  canvasW: number,
  canvasH: number,
  zIndex: number,
  dataUrl: string,
  natW: number,
  natH: number,
): DesignElement {
  const maxW = canvasW * 0.7;
  const maxH = canvasH * 0.7;
  const ratio = Math.min(maxW / natW, maxH / natH, 1);
  const width = Math.round(natW * ratio);
  const height = Math.round(natH * ratio);
  const props: ImageElementProps = { src: dataUrl };
  return {
    id: crypto.randomUUID(),
    type: 'image',
    x: Math.round((canvasW - width) / 2),
    y: Math.round((canvasH - height) / 2),
    width,
    height,
    rotation: 0,
    opacity: 1,
    zIndex,
    props: props as unknown as Record<string, unknown>,
  };
}

/** Crea una forma centrada en el lienzo. */
function newShapeElement(
  canvasW: number,
  canvasH: number,
  zIndex: number,
  variant: ShapeVariant,
): DesignElement {
  const width = Math.round(canvasW * 0.3);
  const height = variant === 'line' ? 0 : Math.round(canvasW * 0.3);
  const props: ShapeElementProps = {
    variant,
    fill: variant === 'line' ? 'transparent' : '#d4af37',
    stroke: '#111111',
    strokeWidth: variant === 'line' ? 4 : 2,
  };
  return {
    id: crypto.randomUUID(),
    type: 'shape',
    x: Math.round((canvasW - width) / 2),
    y: Math.round(canvasH / 2 - height / 2),
    width,
    height,
    rotation: 0,
    opacity: 1,
    zIndex,
    props: props as unknown as Record<string, unknown>,
  };
}

/**
 * Editor de diseño (Fase 2): lienzo Konva con elementos de texto. Orquesta el estado
 * (elementos + selección), delega el render al Canvas, las acciones a la Toolbar y la
 * edición al PropertiesPanel. Guarda título + elementos en Supabase (RLS del usuario).
 */
export function DesignEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [design, setDesign] = useState<Design | null>(null);
  const [title, setTitle] = useState('');
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [background, setBackground] = useState<DesignBackground | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDesign(id).then((d) => {
      setDesign(d);
      setTitle(d?.title ?? '');
      setElements(((d?.elements as unknown as DesignElement[]) ?? []).slice());
      setBackground((d?.background as unknown as DesignBackground | null) ?? null);
      setLoading(false);
      if (!d) setError('No se pudo cargar el diseño (¿sin sesión o no existe?).');
    });
  }, [id]);

  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const updateElement = useCallback((elId: string, patch: Partial<DesignElement>) => {
    setElements((els) => els.map((e) => (e.id === elId ? { ...e, ...patch } : e)));
    setDirty(true);
  }, []);

  const updateSelectedProps = useCallback(
    (patch: Partial<TextElementProps>) => {
      if (!selectedId) return;
      setElements((els) =>
        els.map((e) => (e.id === selectedId ? { ...e, props: { ...e.props, ...patch } } : e)),
      );
      setDirty(true);
    },
    [selectedId],
  );

  const updateSelectedShapeProps = useCallback(
    (patch: Partial<ShapeElementProps>) => {
      if (!selectedId) return;
      setElements((els) =>
        els.map((e) => (e.id === selectedId ? { ...e, props: { ...e.props, ...patch } } : e)),
      );
      setDirty(true);
    },
    [selectedId],
  );

  const bringToFront = useCallback(() => {
    if (!selectedId) return;
    setElements((els) => {
      const maxZ = els.reduce((m, e) => Math.max(m, e.zIndex), 0);
      return els.map((e) => (e.id === selectedId ? { ...e, zIndex: maxZ + 1 } : e));
    });
    setDirty(true);
  }, [selectedId]);

  const sendToBack = useCallback(() => {
    if (!selectedId) return;
    setElements((els) => {
      const minZ = els.reduce((m, e) => Math.min(m, e.zIndex), 0);
      return els.map((e) => (e.id === selectedId ? { ...e, zIndex: minZ - 1 } : e));
    });
    setDirty(true);
  }, [selectedId]);

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setElements((els) => els.filter((e) => e.id !== selectedId));
    setSelectedId(null);
    setDirty(true);
  }, [selectedId]);

  async function removeBgOnSelected() {
    if (!selected || selected.type !== 'image') return;
    const src = (selected.props as unknown as ImageElementProps).src;
    setRemovingBg(true);
    setError(null);
    try {
      // dataURL → Blob para subirlo como archivo al motor.
      const blob = await (await fetch(src)).blob();
      const { image } = await engineClient.image.removeBackgroundInline(blob);
      updateSelectedProps({ src: image } as unknown as Partial<TextElementProps>);
    } catch {
      setError('No se pudo quitar el fondo. ¿El motor está corriendo?');
    } finally {
      setRemovingBg(false);
    }
  }

  function addText() {
    if (!design) return;
    const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const el = newTextElement(design.width, design.height, maxZ + 1);
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
    setDirty(true);
  }

  const nextZ = () => elements.reduce((m, e) => Math.max(m, e.zIndex), 0) + 1;

  function addImage(dataUrl: string, natW: number, natH: number) {
    if (!design) return;
    const el = newImageElement(design.width, design.height, nextZ(), dataUrl, natW, natH);
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
    setDirty(true);
  }

  function addShape(variant: ShapeVariant) {
    if (!design) return;
    const el = newShapeElement(design.width, design.height, nextZ(), variant);
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
    setDirty(true);
  }

  function changeBackground(bg: DesignBackground) {
    setBackground(bg);
    setDirty(true);
  }

  async function handleExport() {
    const stage = stageRef.current;
    if (!stage) return;
    setExporting(true);
    setError(null);
    try {
      const dataUrl = stageToPngDataUrl(stage);
      const name = `${(title || 'diseno').replace(/[^\w.-]+/g, '_')}.png`;
      const ok = await savePng(dataUrl, name);
      if (ok) setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setError('No se pudo exportar el PNG.');
    } finally {
      setExporting(false);
    }
  }

  // Suprimir borra el elemento seleccionado (salvo si el foco está en un campo de texto).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        removeSelected();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, removeSelected]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await updateDesign(id, { title, elements, background: background ?? undefined });
      setSavedAt(new Date().toLocaleTimeString());
      setDirty(false);
    } catch {
      setError('No se pudo guardar. Revisa la conexión.');
    } finally {
      setSaving(false);
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

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/diseno')}>
          ← Galería
        </Button>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          className="flex-1 rounded border border-line bg-elevated px-3 py-1 text-sm text-text outline-none focus:border-gold"
        />
        <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? 'Guardando…' : dirty ? 'Guardar' : 'Guardado'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exportando…' : 'Exportar PNG'}
        </Button>
        {savedAt && !dirty && <span className="text-xs text-text-faint">Guardado {savedAt}</span>}
      </div>

      {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}

      <div className="flex gap-4">
        <Toolbar onAddText={addText} onAddImage={addImage} onAddShape={addShape} />

        <div className="grid flex-1 place-items-center overflow-auto rounded border border-line bg-elevated p-6">
          <Canvas
            width={design.width}
            height={design.height}
            background={background}
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={updateElement}
            stageRef={stageRef}
          />
        </div>

        {selected ? (
          <PropertiesPanel
            element={selected}
            onChangeProps={updateSelectedProps}
            onChangeShapeProps={updateSelectedShapeProps}
            onChangeElement={(patch) => selectedId && updateElement(selectedId, patch)}
            onBringToFront={bringToFront}
            onSendToBack={sendToBack}
            onRemoveBg={removeBgOnSelected}
            removingBg={removingBg}
            onDelete={removeSelected}
          />
        ) : (
          <BackgroundPanel background={background} onChange={changeBackground} />
        )}
      </div>

      <p className="mt-2 text-center text-xs text-text-faint">
        Lienzo {design.width}×{design.height} · texto (imágenes y formas en la próxima fase)
      </p>
    </div>
  );
}
