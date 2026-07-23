import { useRef } from 'react';
import { ImagePlus, Paintbrush } from 'lucide-react';
import type { DesignBackground } from '@ultrathing/core';

interface BackgroundPanelProps {
  background: DesignBackground | null;
  onChange: (bg: DesignBackground) => void;
}

const fieldLabel = 'mb-1 block text-xs text-text-muted';

/** Panel de fondo del lienzo (se muestra sin selección): color plano o imagen. */
export function BackgroundPanel({ background, onChange }: BackgroundPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const color = background?.type === 'color' ? background.value : '#ffffff';

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ type: 'image', value: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex w-56 shrink-0 flex-col gap-3">
      <p className="text-xs uppercase tracking-wide text-text-faint">Fondo del lienzo</p>

      <div className="flex items-end gap-2">
        <div>
          <label className={fieldLabel}>Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => onChange({ type: 'color', value: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border border-line bg-elevated"
          />
        </div>
        <button
          className="flex items-center gap-1 rounded border border-line px-2 py-1 text-xs text-text hover:border-gold hover:text-gold"
          onClick={() => onChange({ type: 'color', value: '#ffffff' })}
        >
          <Paintbrush size={13} /> Blanco
        </button>
      </div>

      <div>
        <label className={fieldLabel}>Imagen</label>
        <button
          className="flex w-full items-center gap-2 rounded border border-line px-3 py-2 text-sm text-text hover:border-gold hover:text-gold"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus size={16} /> Subir imagen de fondo
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {background?.type === 'image' && (
        <button
          className="text-left text-xs text-text-faint hover:text-[var(--danger)]"
          onClick={() => onChange({ type: 'color', value: '#ffffff' })}
        >
          Quitar imagen de fondo
        </button>
      )}

      <p className="text-xs text-text-faint">
        Selecciona un elemento del lienzo para editar sus propiedades.
      </p>
    </div>
  );
}
