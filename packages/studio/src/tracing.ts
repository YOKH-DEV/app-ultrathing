/**
 * Conversor "imagen → editable": traduce el resultado del tracer del motor (elementos
 * agnósticos en px de la imagen) a shapes reales de tldraw en el lienzo.
 *
 * Usa los custom shapes de UltraThing (`ultra-text`/`ultra-box`) para conservar el COLOR
 * HEX EXACTO detectado por el motor (las shapes nativas de tldraw lo perderían en su
 * paleta nombrada). El fondo reconstruido va como imagen (píxeles exactos) al fondo.
 */
import { AssetRecordType, createShapeId, getHashForString, type Editor } from './sdk';
import { ensureFont } from './fonts';


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
  overlay?: boolean | null;
  bg_color?: string | null;
  patch?: string | null;
  font_family?: string | null;
  font_weight?: number | null;
}

export interface StudioTrace {
  width: number;
  height: number;
  background: string | null;
  palette: string[];
  elements: StudioTraceElement[];
}

/**
 * Calcula el tamaño de fuente para que el texto ocupe EXACTAMENTE el ancho de su caja
 * original (fit-to-width). Es lo que hace que la capa de texto conserve tamaño y posición
 * fieles al original — la altura del OCR sola subestima el tamaño real. Mide con la misma
 * familia/peso que se va a renderizar; acota por la altura de la caja para textos cortos.
 */
function fitFontSize(
  text: string,
  family: string | null | undefined,
  weight: number,
  targetWidth: number,
  targetHeight: number,
): number {
  if (typeof document === 'undefined') return Math.max(6, Math.round(targetHeight));
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return Math.max(6, Math.round(targetHeight));
  const fam = family && family.length ? `"${family}", Inter, sans-serif` : 'Inter, sans-serif';
  const base = 100;
  ctx.font = `${weight} ${base}px ${fam}`;
  const measured = ctx.measureText(text).width || targetWidth;
  let size = base * (targetWidth / measured);
  // Para textos cortos en cajas anchas, el ancho mandaría un tamaño enorme: acotar por
  // la altura real de la línea (con un margen).
  size = Math.min(size, targetHeight * 1.35);
  return Math.max(6, Math.round(size));
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
        // Carga la Google Font detectada por la IA para el render fiel del texto.
        if (el.font_family) ensureFont(el.font_family);
        const weight = el.font_weight ?? 400;
        // Tamaño ajustado al ancho real → conserva tamaño y posición del original.
        const fontSize = fitFontSize(el.text, el.font_family, weight, el.w, el.h);
        editor.createShape({
          id: createShapeId(),
          type: 'ultra-text',
          x: el.x,
          y: el.y,
          props: {
            w: Math.max(8, el.w),
            h: Math.max(el.h, fontSize * 1.15),
            text: el.text,
            color: el.color ?? '#111111',
            fontSize,
            align: 'left',
            // El tracer ahora separa el texto del fondo → capa visible y movible.
            overlay: el.overlay ?? false,
            bgColor: el.bg_color ?? '',
            patch: el.patch ?? '',
            fontFamily: el.font_family ?? '',
            fontWeight: weight,
            edited: false,
          },
        });
        created++;
      } else if (el.kind === 'rect' || el.kind === 'ellipse') {
        editor.createShape({
          id: createShapeId(),
          type: 'ultra-box',
          x: el.x,
          y: el.y,
          props: {
            w: el.w,
            h: el.h,
            color: el.fill ?? '#d4af37',
            kind: el.kind === 'ellipse' ? 'ellipse' : 'rect',
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
