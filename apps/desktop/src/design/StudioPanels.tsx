import { useEffect, useReducer, useRef } from 'react';
import {
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Type,
  Image as ImageIcon,
  Square,
  Frame as FrameIcon,
  Shapes,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
} from 'lucide-react';
import { getBlocks } from '@ultrathing/studio';
import type { Editor, TLShape, TLShapeId } from '@ultrathing/studio/sdk';

/**
 * Panel derecho (Propiedades + Capas) y galería inferior del Studio de diseño.
 * Reaccionan a los cambios del lienzo suscribiéndose a los side effects de tldraw
 * (crear/cambiar/borrar shapes) y a la selección (`instance_page_state`). Todo el
 * estado vive en tldraw: acá sólo forzamos un re-render coalescido por frame y
 * releemos del editor, sin duplicar el modelo.
 */

/** Fuerza re-render cuando el lienzo o la selección cambian (coalescido por rAF). */
function useEditorTick(editor: Editor | null): void {
  const [, force] = useReducer((n: number) => n + 1, 0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!editor) return;
    const bump = () => {
      if (raf.current != null) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = null;
        force();
      });
    };
    const offs = [
      editor.sideEffects.registerAfterCreateHandler('shape', bump),
      editor.sideEffects.registerAfterChangeHandler('shape', bump),
      editor.sideEffects.registerAfterDeleteHandler('shape', bump),
      editor.sideEffects.registerAfterChangeHandler('instance_page_state', bump),
    ];
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
      offs.forEach((off) => off());
    };
  }, [editor]);
}

/** Nombre legible + icono para una capa según su tipo de shape. */
function shapeMeta(shape: TLShape): { label: string; Icon: typeof Type } {
  switch (shape.type) {
    case 'frame':
      return {
        label: String((shape.props as { name?: string }).name || 'Bloque'),
        Icon: FrameIcon,
      };
    case 'text':
    case 'ultra-text':
      return { label: 'Texto', Icon: Type };
    case 'image':
      return { label: 'Imagen', Icon: ImageIcon };
    case 'geo':
    case 'ultra-box':
      return { label: 'Forma', Icon: Square };
    default:
      return { label: 'Elemento', Icon: Shapes };
  }
}

const panelTitle =
  'font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted';

const iconBtn =
  'grid h-6 w-6 place-items-center rounded-md text-text-muted transition-colors hover:bg-[var(--glass-strong)] hover:text-gold disabled:cursor-not-allowed disabled:opacity-30';

/** Botón de alineación (deshabilitado si hay menos de 2 shapes seleccionados). */
function AlignBtn({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="grid h-8 flex-1 place-items-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-text-muted transition-colors hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[var(--glass-border)] disabled:hover:text-text-muted"
    >
      {children}
    </button>
  );
}

/**
 * Panel derecho: PROPIEDADES (del shape seleccionado) + CAPAS (todas las del page).
 * ~240px, glass, oculto en <lg. Guarda la opacidad previa de cada capa oculta para
 * poder restaurarla al volver a mostrarla.
 */
export function StudioRightPanel({ editor }: { editor: Editor | null }) {
  useEditorTick(editor);
  // Opacidad previa de las capas ocultas por el botón de ojo (id → opacidad).
  const hiddenRef = useRef<Map<TLShapeId, number>>(new Map());

  if (!editor) return null;

  const shapes = editor.getCurrentPageShapes();
  const layers = [...shapes].reverse(); // las de arriba, primero
  const selectedIds = new Set(editor.getSelectedShapeIds());
  const selectedShapes = editor.getSelectedShapes();
  const primary = selectedShapes[0];
  const canAlign = selectedShapes.length >= 2;

  const selectLayer = (id: TLShapeId) => {
    editor.select(id);
    editor.zoomToSelection?.({ animation: { duration: 150 } });
  };

  const toggleHidden = (shape: TLShape) => {
    const map = hiddenRef.current;
    if (map.has(shape.id)) {
      const prev = map.get(shape.id) ?? 1;
      map.delete(shape.id);
      editor.updateShape({ id: shape.id, type: shape.type, opacity: prev });
    } else {
      map.set(shape.id, shape.opacity);
      editor.updateShape({ id: shape.id, type: shape.type, opacity: 0 });
    }
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 shadow-[var(--glow-soft)] backdrop-blur-[var(--glass-blur)] lg:flex">
      {/* PROPIEDADES */}
      <section className="flex flex-col gap-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-strong)] p-3">
        <h3 className={panelTitle}>Propiedades</h3>
        {primary ? (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>Opacidad</span>
                <span className="tabular-nums text-gold">
                  {Math.round(primary.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={primary.opacity}
                onChange={(e) =>
                  editor.setOpacityForSelectedShapes(Number(e.target.value))
                }
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-gold"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-text-muted">Alineación</span>
              <div className="flex gap-1.5">
                <AlignBtn
                  title="Izquierda"
                  disabled={!canAlign}
                  onClick={() => editor.alignShapes(selectedShapes, 'left')}
                >
                  <AlignHorizontalJustifyStart className="h-3.5 w-3.5" />
                </AlignBtn>
                <AlignBtn
                  title="Centro horizontal"
                  disabled={!canAlign}
                  onClick={() => editor.alignShapes(selectedShapes, 'center-horizontal')}
                >
                  <AlignHorizontalJustifyCenter className="h-3.5 w-3.5" />
                </AlignBtn>
                <AlignBtn
                  title="Derecha"
                  disabled={!canAlign}
                  onClick={() => editor.alignShapes(selectedShapes, 'right')}
                >
                  <AlignHorizontalJustifyEnd className="h-3.5 w-3.5" />
                </AlignBtn>
              </div>
              <div className="flex gap-1.5">
                <AlignBtn
                  title="Arriba"
                  disabled={!canAlign}
                  onClick={() => editor.alignShapes(selectedShapes, 'top')}
                >
                  <AlignVerticalJustifyStart className="h-3.5 w-3.5" />
                </AlignBtn>
                <AlignBtn
                  title="Centro vertical"
                  disabled={!canAlign}
                  onClick={() => editor.alignShapes(selectedShapes, 'center-vertical')}
                >
                  <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
                </AlignBtn>
                <AlignBtn
                  title="Abajo"
                  disabled={!canAlign}
                  onClick={() => editor.alignShapes(selectedShapes, 'bottom')}
                >
                  <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />
                </AlignBtn>
              </div>
              {!canAlign && (
                <span className="text-[10px] text-text-faint">
                  Seleccioná 2+ para alinear
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-text-faint">Seleccioná un elemento</p>
        )}
      </section>

      {/* CAPAS */}
      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <h3 className={panelTitle}>Capas</h3>
        {layers.length === 0 ? (
          <p className="text-[11px] text-text-faint">El lienzo está vacío</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {layers.map((shape) => {
              const { label, Icon } = shapeMeta(shape);
              const active = selectedIds.has(shape.id);
              const hidden = hiddenRef.current.has(shape.id);
              return (
                <li
                  key={shape.id}
                  className={`group flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors ${
                    active
                      ? 'border-gold/60 bg-[var(--glass-strong)] shadow-[var(--glow-soft)]'
                      : 'border-transparent hover:border-[var(--glass-border)] hover:bg-[var(--glass-strong)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectLayer(shape.id)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-gold' : 'text-text-muted'}`}
                    />
                    <span
                      className={`truncate text-xs ${active ? 'text-text' : 'text-text-muted'}`}
                    >
                      {label}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleHidden(shape)}
                    title={hidden ? 'Mostrar' : 'Ocultar'}
                    className={iconBtn}
                  >
                    {hidden ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.bringForward([shape.id])}
                    title="Subir capa"
                    className={iconBtn}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.sendBackward([shape.id])}
                    title="Bajar capa"
                    className={iconBtn}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}

/**
 * Galería inferior: miniaturas (nombre + recuadro) de los bloques del tablero.
 * Clic → selecciona y encuadra el bloque. Si no hay bloques, no se renderiza nada.
 */
export function StudioBlockGallery({ editor }: { editor: Editor | null }) {
  useEditorTick(editor);
  if (!editor) return null;

  const blocks = getBlocks(editor);
  if (blocks.length === 0) return null;

  const selectedIds = new Set(editor.getSelectedShapeIds());

  return (
    <div className="mt-3 flex items-center gap-2 overflow-x-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 shadow-[var(--glow-soft)] backdrop-blur-[var(--glass-blur)] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line">
      <span className="shrink-0 pl-1 pr-1 font-display text-[10px] uppercase tracking-[0.18em] text-text-faint">
        Bloques
      </span>
      {blocks.map((frame) => {
        const active = selectedIds.has(frame.id);
        const ratio = frame.props.h > 0 ? frame.props.w / frame.props.h : 1;
        return (
          <button
            key={frame.id}
            type="button"
            onClick={() => {
              editor.select(frame.id);
              editor.zoomToSelection?.({ animation: { duration: 200 } });
            }}
            title={frame.props.name}
            className={`flex shrink-0 flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors ${
              active
                ? 'border-gold/60 bg-[var(--glass-strong)] shadow-[var(--glow-soft)]'
                : 'border-[var(--glass-border)] hover:border-gold/40 hover:bg-[var(--glass-strong)]'
            }`}
          >
            <div
              className={`grid h-10 place-items-center rounded bg-elevated ${active ? 'ring-1 ring-gold/50' : ''}`}
              style={{ width: `${Math.min(2.5, Math.max(1, ratio)) * 2.5}rem` }}
            >
              <FrameIcon
                className={`h-4 w-4 ${active ? 'text-gold' : 'text-text-faint'}`}
              />
            </div>
            <span
              className={`max-w-[5rem] truncate text-[10px] ${active ? 'text-gold' : 'text-text-muted'}`}
            >
              {frame.props.name || 'Diseño'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
