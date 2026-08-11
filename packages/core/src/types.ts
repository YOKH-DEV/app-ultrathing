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

/**
 * Fondo guardado en la columna `designs.background`. Lo dejó el editor konva original;
 * el studio guarda su fondo dentro del propio documento (un shape más del snapshot),
 * así que hoy sólo sobrevive el tipo para no romper la firma de `updateDesign`.
 */
export type DesignBackground =
  | { type: 'color'; value: string }
  | { type: 'image'; value: string };

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
