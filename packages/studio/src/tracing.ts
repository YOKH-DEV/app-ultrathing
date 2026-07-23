/**
 * Conversor "imagen → editable": traduce el resultado del tracer del motor (elementos
 * agnósticos en px de la imagen) a shapes reales de tldraw en el lienzo.
 *
 * El motor detecta color exacto (hex); las shapes por defecto de tldraw usan una paleta
 * nombrada, así que el color de texto se mapea al más cercano. El fondo reconstruido va
 * como imagen (píxeles exactos), y encima caen los textos editables. Color 100% fiel =
 * shapes propios (siguiente incremento).
 */
import {
  AssetRecordType,
  createShapeId,
  getHashForString,
  toRichText,
  type Editor,
  type TLDefaultColorStyle,
} from './sdk';

/** Elemento agnóstico que emite el tracer (estructural: no acopla a @ultrathing/api-client). */
export interface StudioTraceElement {
  kind: 'text' | 'rect' | 'ellipse' | 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string | null;
  font_size?: number | null;
  color?: string | null;
  fill?: string | null;
  src?: string | null;
}

export interface StudioTrace {
  width: number;
  height: number;
  background: string | null;
  palette: string[];
  elements: StudioTraceElement[];
}

// Anclas RGB de la paleta nombrada de tldraw, para mapear un hex arbitrario al más cercano.
const PALETTE: Array<[TLDefaultColorStyle, [number, number, number]]> = [
  ['black', [29, 29, 29]],
  ['grey', [159, 168, 178]],
  ['light-violet', [224, 133, 244]],
  ['violet', [174, 62, 201]],
  ['blue', [68, 101, 233]],
  ['light-blue', [75, 161, 241]],
  ['yellow', [241, 172, 75]],
  ['orange', [225, 105, 25]],
  ['green', [9, 146, 104]],
  ['light-green', [76, 176, 94]],
  ['light-red', [248, 119, 119]],
  ['red', [224, 49, 49]],
  ['white', [255, 255, 255]],
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

/** Color nombrado de tldraw más cercano a un hex (distancia euclídea en RGB). */
function nearestColor(hex: string | null | undefined): TLDefaultColorStyle {
  if (!hex) return 'black';
  const [r, g, b] = hexToRgb(hex);
  let best: TLDefaultColorStyle = 'black';
  let bestD = Infinity;
  for (const [name, [pr, pg, pb]] of PALETTE) {
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

/**
 * Monta los elementos del tracer como shapes en el lienzo y encuadra la vista.
 * Devuelve la cantidad de shapes creados.
 */
export function traceToShapes(editor: Editor, trace: StudioTrace): number {
  let created = 0;
  editor.run(() => {
    for (const el of trace.elements) {
      if (el.kind === 'image' && el.src) {
        const assetId = AssetRecordType.createId(getHashForString(el.src));
        editor.createAssets([
          {
            id: assetId,
            type: 'image',
            typeName: 'asset',
            meta: {},
            props: {
              w: el.w,
              h: el.h,
              name: 'fondo.png',
              isAnimated: false,
              mimeType: 'image/png',
              src: el.src,
            },
          },
        ]);
        editor.createShape({
          id: createShapeId(),
          type: 'image',
          x: el.x,
          y: el.y,
          props: { assetId, w: el.w, h: el.h },
        });
        created++;
      } else if (el.kind === 'text' && el.text) {
        editor.createShape({
          id: createShapeId(),
          type: 'text',
          x: el.x,
          y: el.y,
          props: {
            richText: toRichText(el.text),
            color: nearestColor(el.color),
            size: 'm',
            autoSize: true,
            scale: Math.max(0.25, (el.font_size ?? 24) / 24),
          },
        });
        created++;
      } else if (el.kind === 'rect' || el.kind === 'ellipse') {
        editor.createShape({
          id: createShapeId(),
          type: 'geo',
          x: el.x,
          y: el.y,
          props: {
            geo: el.kind === 'ellipse' ? 'ellipse' : 'rectangle',
            w: el.w,
            h: el.h,
            color: nearestColor(el.fill),
            fill: 'solid',
          },
        });
        created++;
      }
    }
  });
  // Encuadrar la pieza recién montada.
  editor.zoomToFit({ animation: { duration: 200 } });
  return created;
}
