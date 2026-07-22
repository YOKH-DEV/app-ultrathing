import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  BringToFront,
  SendToBack,
  Eraser,
} from 'lucide-react';
import { Button } from '@ultrathing/ui';
import {
  DESIGN_FONTS,
  type DesignElement,
  type TextElementProps,
  type ShapeElementProps,
} from '@ultrathing/core';

interface PropertiesPanelProps {
  element: DesignElement | null;
  onChangeProps: (patch: Partial<TextElementProps>) => void;
  onChangeShapeProps: (patch: Partial<ShapeElementProps>) => void;
  onChangeElement: (patch: Partial<DesignElement>) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onRemoveBg: () => void;
  removingBg: boolean;
  onDelete: () => void;
}

const fieldLabel = 'mb-1 block text-xs text-text-muted';
const inputBase =
  'w-full rounded border border-line bg-elevated px-2 py-1 text-sm text-text outline-none focus:border-gold';

function hasBold(fontStyle: string) {
  return fontStyle.includes('bold');
}
function hasItalic(fontStyle: string) {
  return fontStyle.includes('italic');
}
function composeFontStyle(bold: boolean, italic: boolean): string {
  const parts = [italic ? 'italic' : '', bold ? 'bold' : ''].filter(Boolean);
  return parts.join(' ') || 'normal';
}

const toggleClass = (active: boolean) =>
  `grid h-8 w-8 place-items-center rounded border ${
    active ? 'border-gold bg-gold text-[var(--on-gold)]' : 'border-line text-text'
  }`;

/** Panel derecho: propiedades del elemento seleccionado, distintas por tipo. */
export function PropertiesPanel({
  element,
  onChangeProps,
  onChangeShapeProps,
  onChangeElement,
  onBringToFront,
  onSendToBack,
  onRemoveBg,
  removingBg,
  onDelete,
}: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="w-56 shrink-0 text-sm text-text-faint">
        Selecciona un elemento para editar sus propiedades.
      </div>
    );
  }

  return (
    <div className="flex w-56 shrink-0 flex-col gap-3">
      {element.type === 'text' && (
        <TextProps element={element} onChangeProps={onChangeProps} />
      )}
      {element.type === 'shape' && (
        <ShapeProps element={element} onChangeShapeProps={onChangeShapeProps} />
      )}
      {element.type === 'image' && (
        <ImageProps removingBg={removingBg} onRemoveBg={onRemoveBg} />
      )}

      {/* Comunes a todos los tipos */}
      <div>
        <label className={fieldLabel}>Opacidad · {Math.round(element.opacity * 100)}%</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={element.opacity}
          onChange={(e) => onChangeElement({ opacity: Number(e.target.value) })}
          className="w-full accent-[var(--gold)]"
        />
      </div>

      <div>
        <label className={fieldLabel}>Rotación · {Math.round(element.rotation)}°</label>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={element.rotation}
          onChange={(e) => onChangeElement({ rotation: Number(e.target.value) })}
          className="w-full accent-[var(--gold)]"
        />
      </div>

      <div className="flex gap-1">
        <button className={`${toggleClass(false)} w-auto px-2`} title="Traer al frente" onClick={onBringToFront}>
          <BringToFront size={15} />
        </button>
        <button className={`${toggleClass(false)} w-auto px-2`} title="Enviar al fondo" onClick={onSendToBack}>
          <SendToBack size={15} />
        </button>
      </div>

      <Button variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 size={15} className="mr-1 inline" /> Eliminar
      </Button>
    </div>
  );
}

function TextProps({
  element,
  onChangeProps,
}: {
  element: DesignElement;
  onChangeProps: (patch: Partial<TextElementProps>) => void;
}) {
  const p = element.props as unknown as TextElementProps;
  const bold = hasBold(p.fontStyle);
  const italic = hasItalic(p.fontStyle);
  return (
    <>
      <p className="text-xs uppercase tracking-wide text-text-faint">Texto</p>
      <div>
        <label className={fieldLabel}>Contenido</label>
        <textarea
          value={p.text}
          onChange={(e) => onChangeProps({ text: e.target.value })}
          rows={3}
          className={`${inputBase} resize-y`}
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={fieldLabel}>Fuente</label>
          <select
            value={p.fontFamily}
            onChange={(e) => onChangeProps({ fontFamily: e.target.value })}
            className={`${inputBase} cursor-pointer`}
          >
            {DESIGN_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="w-16">
          <label className={fieldLabel}>Tamaño</label>
          <input
            type="number"
            min={6}
            max={400}
            value={p.fontSize}
            onChange={(e) => onChangeProps({ fontSize: Number(e.target.value) || p.fontSize })}
            className={inputBase}
          />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className={fieldLabel}>Color</label>
          <input
            type="color"
            value={p.fill}
            onChange={(e) => onChangeProps({ fill: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border border-line bg-elevated"
          />
        </div>
        <div className="flex gap-1">
          <button
            className={toggleClass(bold)}
            title="Negrita"
            onClick={() => onChangeProps({ fontStyle: composeFontStyle(!bold, italic) })}
          >
            <Bold size={15} />
          </button>
          <button
            className={toggleClass(italic)}
            title="Itálica"
            onClick={() => onChangeProps({ fontStyle: composeFontStyle(bold, !italic) })}
          >
            <Italic size={15} />
          </button>
        </div>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((al) => {
            const Icon = al === 'left' ? AlignLeft : al === 'center' ? AlignCenter : AlignRight;
            return (
              <button
                key={al}
                className={toggleClass(p.align === al)}
                title={`Alinear ${al}`}
                onClick={() => onChangeProps({ align: al })}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ShapeProps({
  element,
  onChangeShapeProps,
}: {
  element: DesignElement;
  onChangeShapeProps: (patch: Partial<ShapeElementProps>) => void;
}) {
  const p = element.props as unknown as ShapeElementProps;
  const label = p.variant === 'rect' ? 'Rectángulo' : p.variant === 'circle' ? 'Círculo' : 'Línea';
  return (
    <>
      <p className="text-xs uppercase tracking-wide text-text-faint">{label}</p>
      {p.variant !== 'line' && (
        <div className="flex items-end gap-2">
          <div>
            <label className={fieldLabel}>Relleno</label>
            <input
              type="color"
              value={p.fill === 'transparent' ? '#000000' : p.fill}
              onChange={(e) => onChangeShapeProps({ fill: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-line bg-elevated"
            />
          </div>
        </div>
      )}
      <div className="flex items-end gap-2">
        <div>
          <label className={fieldLabel}>Borde</label>
          <input
            type="color"
            value={p.stroke}
            onChange={(e) => onChangeShapeProps({ stroke: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border border-line bg-elevated"
          />
        </div>
        <div className="flex-1">
          <label className={fieldLabel}>Grosor · {p.strokeWidth}px</label>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={p.strokeWidth}
            onChange={(e) => onChangeShapeProps({ strokeWidth: Number(e.target.value) })}
            className="w-full accent-[var(--gold)]"
          />
        </div>
      </div>
    </>
  );
}

function ImageProps({ removingBg, onRemoveBg }: { removingBg: boolean; onRemoveBg: () => void }) {
  return (
    <>
      <p className="text-xs uppercase tracking-wide text-text-faint">Imagen</p>
      <Button variant="ghost" size="sm" onClick={onRemoveBg} disabled={removingBg}>
        <Eraser size={15} className="mr-1 inline" />
        {removingBg ? 'Quitando fondo…' : 'Quitar fondo'}
      </Button>
    </>
  );
}
