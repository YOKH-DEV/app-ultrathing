import { Type, Image as ImageIcon, Square } from 'lucide-react';

interface ToolbarProps {
  onAddText: () => void;
}

const itemBase =
  'flex w-full items-center gap-2 rounded border border-line px-3 py-2 text-sm text-text transition-colors';

/**
 * Barra de herramientas (izquierda). En la Fase 2 solo "Agregar texto"; imagen y forma
 * llegan en la Fase 3 (se muestran deshabilitadas para dejar clara la ruta).
 */
export function Toolbar({ onAddText }: ToolbarProps) {
  return (
    <div className="flex w-44 shrink-0 flex-col gap-2">
      <p className="mb-1 text-xs uppercase tracking-wide text-text-faint">Agregar</p>
      <button className={`${itemBase} hover:border-gold hover:text-gold`} onClick={onAddText}>
        <Type size={16} /> Texto
      </button>
      <button
        className={`${itemBase} cursor-not-allowed opacity-40`}
        disabled
        title="Próxima fase"
      >
        <ImageIcon size={16} /> Imagen
      </button>
      <button
        className={`${itemBase} cursor-not-allowed opacity-40`}
        disabled
        title="Próxima fase"
      >
        <Square size={16} /> Forma
      </button>
    </div>
  );
}
