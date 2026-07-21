import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import { Button } from '@ultrathing/ui';
import { DESIGN_FONTS, type DesignElement, type TextElementProps } from '@ultrathing/core';

interface PropertiesPanelProps {
  element: DesignElement | null;
  onChangeProps: (patch: Partial<TextElementProps>) => void;
  onChangeElement: (patch: Partial<DesignElement>) => void;
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
/** Compone el string que Konva espera a partir de los toggles. */
function composeFontStyle(bold: boolean, italic: boolean): string {
  const parts = [italic ? 'italic' : '', bold ? 'bold' : ''].filter(Boolean);
  return parts.join(' ') || 'normal';
}

/**
 * Panel derecho: propiedades del elemento seleccionado. En la Fase 2 solo texto.
 * Sin selección, muestra una pista.
 */
export function PropertiesPanel({
  element,
  onChangeProps,
  onChangeElement,
  onDelete,
}: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="w-56 shrink-0 text-sm text-text-faint">
        Selecciona un elemento para editar sus propiedades.
      </div>
    );
  }

  const p = element.props as unknown as TextElementProps;
  const bold = hasBold(p.fontStyle);
  const italic = hasItalic(p.fontStyle);

  const toggleClass = (active: boolean) =>
    `grid h-8 w-8 place-items-center rounded border ${
      active ? 'border-gold bg-gold text-[var(--on-gold)]' : 'border-line text-text'
    }`;

  return (
    <div className="flex w-56 shrink-0 flex-col gap-3">
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

      <Button variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 size={15} className="mr-1 inline" /> Eliminar
      </Button>
    </div>
  );
}
