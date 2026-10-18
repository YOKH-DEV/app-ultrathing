/**
 * Camino inverso de `traceToShapes`: lee lo que hay en el lienzo y lo devuelve en el
 * contrato neutro de elementos (el mismo que emiten el tracer y la IA). Con esto el
 * mismo diseño se puede animar como video (Remotion) sin inventar otro formato.
 */
import type { Editor, TLAssetId } from './sdk';
import type { StudioTrace, StudioTraceElement } from './tracing';
import type { UltraBoxShape, UltraTextShape } from './shapes';

/**
 * Convierte los shapes de la página actual a elementos, normalizando las coordenadas
 * para que la pieza arranque en (0,0). Devuelve también el tamaño total.
 */
export function canvasToTrace(editor: Editor): StudioTrace {
  const shapes = editor.getCurrentPageShapesSorted(); // ya vienen en z-order
  const raw: { el: StudioTraceElement; x: number; y: number }[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    const b = editor.getShapePageBounds(shape);
    if (!b) continue;

    let el: StudioTraceElement | null = null;
    if (shape.type === 'ultra-text') {
      const p = (shape as UltraTextShape).props;
      el = {
        kind: 'text',
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
        text: p.text,
        font_size: p.fontSize,
        color: p.color,
      };
    } else if (shape.type === 'ultra-box') {
      const p = (shape as UltraBoxShape).props;
      el = {
        kind: p.kind === 'ellipse' ? 'ellipse' : 'rect',
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
        fill: p.color,
      };
    } else if (shape.type === 'image') {
      const assetId = (shape.props as { assetId?: string }).assetId;
      const asset = assetId ? editor.getAsset(assetId as TLAssetId) : undefined;
      const src = asset && 'props' in asset ? (asset.props as { src?: string }).src : undefined;
      if (src) el = { kind: 'image', x: b.x, y: b.y, w: b.w, h: b.h, src };
    }
    if (!el) continue;

    raw.push({ el, x: b.x, y: b.y });
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }

  if (!raw.length) return { width: 1080, height: 1350, background: null, palette: [], elements: [] };

  const elements = raw.map(({ el }) => ({ ...el, x: el.x - minX, y: el.y - minY }));
  return {
    width: Math.max(1, Math.round(maxX - minX)),
    height: Math.max(1, Math.round(maxY - minY)),
    background: null,
    palette: [],
    elements,
  };
}
