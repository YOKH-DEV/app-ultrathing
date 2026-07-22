import { useRef } from 'react';
import { Type, Image as ImageIcon, Square, Circle, Minus } from 'lucide-react';
import type { ShapeVariant } from '@ultrathing/core';

interface ToolbarProps {
  onAddText: () => void;
  onAddImage: (dataUrl: string, naturalWidth: number, naturalHeight: number) => void;
  onAddShape: (variant: ShapeVariant) => void;
}

const itemBase =
  'flex w-full items-center gap-2 rounded border border-line px-3 py-2 text-sm text-text transition-colors hover:border-gold hover:text-gold';

/**
 * Barra de herramientas (izquierda, Fase 3): agregar texto, imagen (desde archivo)
 * y formas (rectángulo, círculo, línea).
 */
export function Toolbar({ onAddText, onAddImage, onAddShape }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const probe = new window.Image();
      probe.onload = () => onAddImage(dataUrl, probe.naturalWidth, probe.naturalHeight);
      probe.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex w-44 shrink-0 flex-col gap-2">
      <p className="mb-1 text-xs uppercase tracking-wide text-text-faint">Agregar</p>
      <button className={itemBase} onClick={onAddText}>
        <Type size={16} /> Texto
      </button>
      <button className={itemBase} onClick={() => fileRef.current?.click()}>
        <ImageIcon size={16} /> Imagen
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <p className="mb-1 mt-3 text-xs uppercase tracking-wide text-text-faint">Formas</p>
      <button className={itemBase} onClick={() => onAddShape('rect')}>
        <Square size={16} /> Rectángulo
      </button>
      <button className={itemBase} onClick={() => onAddShape('circle')}>
        <Circle size={16} /> Círculo
      </button>
      <button className={itemBase} onClick={() => onAddShape('line')}>
        <Minus size={16} /> Línea
      </button>
    </div>
  );
}
