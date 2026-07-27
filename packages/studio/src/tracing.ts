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
        // Carga la Google Font detectada por la IA para que el texto, al editarse, se
        // re-dibuje con la familia más parecida a la original.
        if (el.font_family) ensureFont(el.font_family);
        editor.createShape({
          id: createShapeId(),
          type: 'ultra-text',
          x: el.x,
          y: el.y,
          props: {
            w: Math.max(24, el.w),
            h: Math.max(el.font_size ?? 24, el.h),
            text: el.text,
            color: el.color ?? '#111111',
            fontSize: el.font_size ?? 24,
            align: 'left',
            // Overlay no destructivo: si viene del tracer (overlay), el texto queda
            // invisible hasta editarse y `patch`/`bgColor` tapan el original en ese momento.
            overlay: el.overlay ?? false,
            bgColor: el.bg_color ?? '',
            patch: el.patch ?? '',
            fontFamily: el.font_family ?? '',
            fontWeight: el.font_weight ?? 700,
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
