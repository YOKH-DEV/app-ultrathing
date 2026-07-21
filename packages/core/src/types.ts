import { z } from 'zod';

/** Dónde se muestra un feature. Es la fuente de verdad del reparto web/escritorio. */
export type Surface = 'desktop' | 'web' | 'both';

/** Estado de un trabajo pesado del motor. */
export const JobStatus = z.enum(['queued', 'running', 'done', 'error']);
export type JobStatus = z.infer<typeof JobStatus>;

export const Job = z.object({
  id: z.string(),
  module: z.string(),
  status: JobStatus,
  progress: z.number().min(0).max(100),
  result: z.unknown().nullable(),
  error: z.string().nullable(),
});
export type Job = z.infer<typeof Job>;

/** Fondo del lienzo: color plano o imagen (dataURL en la v1). */
export type DesignBackground =
  | { type: 'color'; value: string }
  | { type: 'image'; value: string };

/** Tipos de elemento soportados en el lienzo. */
export type DesignElementType = 'text' | 'image' | 'shape';

/** Un elemento del lienzo. `props` depende de `type`; en la Fase 1 la lista va vacía,
 * pero el tipo queda fijado para las fases 2-4 (texto/imagen/forma). */
export interface DesignElement {
  id: string;
  type: DesignElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  props: Record<string, unknown>;
}

/** `props` de un elemento de texto (Fase 2). Coincide con los atributos que Konva.Text
 * entiende, para volcarlos directo al nodo. */
export interface TextElementProps {
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  /** Konva combina estilo y peso en un string: 'normal' | 'bold' | 'italic' | 'italic bold'. */
  fontStyle: string;
  align: 'left' | 'center' | 'right';
}

/** Fuentes ofrecidas en el panel de propiedades (seguras en cualquier sistema). */
export const DESIGN_FONTS = [
  'Inter',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
] as const;

/** Preset de tamaño al crear un diseño. */
export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
}

/** Formatos de redes para "Nuevo diseño". */
export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'ig-post', name: 'Post Instagram (1080×1080)', width: 1080, height: 1080 },
  { id: 'ig-story', name: 'Historia (1080×1920)', width: 1080, height: 1920 },
  { id: 'fb-post', name: 'Post Facebook (1200×630)', width: 1200, height: 630 },
  { id: 'yt-thumb', name: 'Miniatura YouTube (1280×720)', width: 1280, height: 720 },
];
