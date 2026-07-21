import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@ultrathing/ui';
import {
  getDesign,
  updateDesign,
  type Design,
} from '@ultrathing/api-client';
import type { DesignElement, DesignBackground, TextElementProps } from '@ultrathing/core';
import { Canvas } from '../design/Canvas';
import { Toolbar } from '../design/Toolbar';
import { PropertiesPanel } from '../design/PropertiesPanel';

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

  useEffect(() => {
    if (!id) return;
    getDesign(id).then((d) => {
      setDesign(d);
      setTitle(d?.title ?? '');
      setElements(((d?.elements as unknown as DesignElement[]) ?? []).slice());
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

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setElements((els) => els.filter((e) => e.id !== selectedId));
    setSelectedId(null);
    setDirty(true);
  }, [selectedId]);

  function addText() {
    if (!design) return;
    const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const el = newTextElement(design.width, design.height, maxZ + 1);
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
    setDirty(true);
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
      await updateDesign(id, { title, elements });
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

  const background = design.background as unknown as DesignBackground | null;

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
        {savedAt && !dirty && <span className="text-xs text-text-faint">Guardado {savedAt}</span>}
      </div>

      {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}

      <div className="flex gap-4">
        <Toolbar onAddText={addText} />

        <div className="grid flex-1 place-items-center overflow-auto rounded border border-line bg-elevated p-6">
          <Canvas
            width={design.width}
            height={design.height}
            background={background}
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={updateElement}
          />
        </div>

        <PropertiesPanel
          element={selected}
          onChangeProps={updateSelectedProps}
          onChangeElement={(patch) => selectedId && updateElement(selectedId, patch)}
          onDelete={removeSelected}
        />
      </div>

      <p className="mt-2 text-center text-xs text-text-faint">
        Lienzo {design.width}×{design.height} · texto (imágenes y formas en la próxima fase)
      </p>
    </div>
  );
}
