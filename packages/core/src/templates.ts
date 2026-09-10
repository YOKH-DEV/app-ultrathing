/** Categorías de plantilla / tamaño. La barra de Diseño elige una; los presets
 * y las piezas listas se filtran con esto. */
export type TemplateCategoryId =
  | 'redes'
  | 'video'
  | 'presentacion'
  | 'imprimir'
  | 'educacion';

export interface TemplateCategory {
  id: TemplateCategoryId;
  name: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'redes', name: 'Redes' },
  { id: 'video', name: 'Video' },
  { id: 'presentacion', name: 'Presentación' },
  { id: 'imprimir', name: 'Imprimir' },
  { id: 'educacion', name: 'Educación' },
];

/** Preset de tamaño al crear un diseño. */
export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: TemplateCategoryId;
}

/** Formatos con medida correcta, agrupados por categoría. */
export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'ig-post', name: 'Post (1080×1080)', width: 1080, height: 1080, category: 'redes' },
  { id: 'ig-story', name: 'Historia (1080×1920)', width: 1080, height: 1920, category: 'redes' },
  { id: 'ig-portrait', name: 'Retrato (1080×1350)', width: 1080, height: 1350, category: 'redes' },
  { id: 'fb-post', name: 'Facebook (1200×630)', width: 1200, height: 630, category: 'redes' },
  { id: 'yt-thumb', name: 'Miniatura YouTube (1280×720)', width: 1280, height: 720, category: 'video' },
  { id: 'cover-hd', name: 'Cover 16:9 (1920×1080)', width: 1920, height: 1080, category: 'video' },
  { id: 'slide-16-9', name: 'Diapositiva 16:9 (1920×1080)', width: 1920, height: 1080, category: 'presentacion' },
  { id: 'a4', name: 'A4 (2480×3508)', width: 2480, height: 3508, category: 'imprimir' },
  { id: 'flyer', name: 'Flyer A5 (1748×2480)', width: 1748, height: 2480, category: 'imprimir' },
  { id: 'infografia', name: 'Infografía (1080×1920)', width: 1080, height: 1920, category: 'educacion' },
  { id: 'ficha', name: 'Ficha (1080×1080)', width: 1080, height: 1080, category: 'educacion' },
];

/** Receta visual que el studio monta al usar la plantilla. `blank` = lienzo vacío. */
export type TemplateKind = 'blank' | 'promo' | 'quote' | 'story' | 'thumb' | 'hero' | 'flyer';

export interface DesignTemplate {
  id: string;
  title: string;
  category: TemplateCategoryId;
  presetId: string;
  kind: TemplateKind;
  /** Color de la miniatura en la galería. */
  swatch: string;
}

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  { id: 'redes-blank', title: 'Lienzo cuadrado', category: 'redes', presetId: 'ig-post', kind: 'blank', swatch: '#1a1a1a' },
  { id: 'redes-promo', title: 'Oferta / anuncio', category: 'redes', presetId: 'ig-post', kind: 'promo', swatch: '#d4af37' },
  { id: 'redes-quote', title: 'Cita', category: 'redes', presetId: 'ig-post', kind: 'quote', swatch: '#f5efe0' },
  { id: 'redes-story', title: 'Portada historia', category: 'redes', presetId: 'ig-story', kind: 'story', swatch: '#111111' },
  { id: 'redes-portrait', title: 'Retrato en blanco', category: 'redes', presetId: 'ig-portrait', kind: 'blank', swatch: '#0f172a' },
  { id: 'video-thumb', title: 'Miniatura YouTube', category: 'video', presetId: 'yt-thumb', kind: 'thumb', swatch: '#ff0000' },
  { id: 'video-cover', title: 'Cover 16:9', category: 'video', presetId: 'cover-hd', kind: 'hero', swatch: '#111111' },
  { id: 'pres-hero', title: 'Portada de charla', category: 'presentacion', presetId: 'slide-16-9', kind: 'hero', swatch: '#d4af37' },
  { id: 'print-a4', title: 'Hoja A4', category: 'imprimir', presetId: 'a4', kind: 'blank', swatch: '#ffffff' },
  { id: 'print-flyer', title: 'Flyer vertical', category: 'imprimir', presetId: 'flyer', kind: 'flyer', swatch: '#d4af37' },
  { id: 'edu-info', title: 'Infografía', category: 'educacion', presetId: 'infografia', kind: 'story', swatch: '#0f172a' },
  { id: 'edu-ficha', title: 'Ficha cuadrada', category: 'educacion', presetId: 'ficha', kind: 'promo', swatch: '#f5efe0' },
];

export function presetsFor(category: TemplateCategoryId): CanvasPreset[] {
  return CANVAS_PRESETS.filter((p) => p.category === category);
}

export function presetById(id: string): CanvasPreset | undefined {
  return CANVAS_PRESETS.find((p) => p.id === id);
}

export function templatesFor(category: TemplateCategoryId, presetId?: string): DesignTemplate[] {
  return DESIGN_TEMPLATES.filter(
    (t) => t.category === category && (!presetId || t.presetId === presetId),
  );
}

export function templateById(id: string): DesignTemplate | undefined {
  return DESIGN_TEMPLATES.find((t) => t.id === id);
}
