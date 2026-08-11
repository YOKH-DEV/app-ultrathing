/**
 * Fondo del lienzo: un color plano o una imagen que cubre la pieza y queda detrás de todo.
 *
 * No es un ajuste aparte del documento: es **un shape más del snapshot**, marcado en
 * `meta.ultraRole`, bloqueado y mandado al fondo. Esa decisión es la que hace que el
 * fondo viaje solo — se persiste con el resto del diseño, sale en el export PNG/ZIP/PDF
 * y en la miniatura de la galería — sin tocar el esquema de datos ni el pipeline de
 * exportación.
 *
 * En el tablero conviven varias piezas, así que el fondo se aplica al **bloque** en el
 * que se está trabajando (el seleccionado, el que contiene la selección, o el único que
 * haya). Si todavía no hay bloques, se aplica al lienzo del diseño.
 */
import {
  AssetRecordType,
  createShapeId,
  getHashForString,
  type Editor,
  type TLFrameShape,
  type TLImageShape,
  type TLShape,
  type TLShapeCrop,
  type TLShapeId,
} from './sdk';
import { naturalSize, toJpegDataUrl } from './raster';
import type { UltraBoxShape } from './shapes';

/** Fondo de una pieza: color hex plano, o una imagen (dataURL) que la cubre. */
export type StudioBackground =
  | { type: 'color'; value: string }
  | { type: 'image'; value: string };

/** Lo que se puede *aplicar*: además del dataURL, el File/Blob que el usuario acaba de subir. */
export type StudioBackgroundInput =
  | { type: 'color'; value: string }
  | { type: 'image'; value: string | Blob };

/** Marca en `meta` que distingue al fondo del contenido que puso el usuario. */
const BG_ROLE = 'background';

/**
 * Techo del lado mayor de una imagen de fondo. El snapshot completo (con las imágenes
 * incrustadas como dataURL) viaja a Supabase en cada autosave: sin este techo, una foto
 * de cámara de 6 MB se guardaría entera, una y otra vez.
 */
const BG_MAX_PX = 2000;

function isBackgroundShape(shape: TLShape): boolean {
  return shape.meta?.ultraRole === BG_ROLE;
}

/**
 * El bloque sobre el que aplica el fondo: el frame seleccionado, el que contiene a la
 * selección, o —si no hay nada seleccionado— el único frame del tablero. `null` = el
 * lienzo del diseño (todavía sin bloques, o con varios y ninguno elegido).
 */
function resolveFrame(editor: Editor): TLFrameShape | null {
  for (const shape of editor.getSelectedShapes()) {
    if (shape.type === 'frame') return shape as TLFrameShape;
    const parent = editor.getShapeParent(shape);
    if (parent?.type === 'frame') return parent as TLFrameShape;
  }
  const frames = editor
    .getCurrentPageShapes()
    .filter((s): s is TLFrameShape => s.type === 'frame');
  return frames.length === 1 ? frames[0] : null;
}

/** El shape de fondo que ya exista en ese ámbito (dentro del bloque, o en la página). */
function findBackgroundShape(editor: Editor, frame: TLFrameShape | null): TLShape | undefined {
  const parentId = frame ? frame.id : editor.getCurrentPageId();
  return editor
    .getCurrentPageShapes()
    .find((s) => s.parentId === parentId && isBackgroundShape(s));
}

/** Área que debe cubrir el fondo. Dentro de un bloque las coordenadas son relativas a él. */
function backgroundRect(
  frame: TLFrameShape | null,
  canvas: { width: number; height: number },
): { w: number; h: number } {
  return frame
    ? { w: frame.props.w, h: frame.props.h }
    : { w: canvas.width, h: canvas.height };
}

/**
 * Recorte tipo "cover": llena el área completa recortando el sobrante, en vez de
 * deformar la imagen para que entre (que es lo que haría un estirado simple).
 */
function coverCrop(natW: number, natH: number, w: number, h: number): TLShapeCrop {
  const full: TLShapeCrop = { topLeft: { x: 0, y: 0 }, bottomRight: { x: 1, y: 1 } };
  const natAR = natW / natH;
  const targetAR = w / h;
  if (!Number.isFinite(natAR) || !Number.isFinite(targetAR) || natAR <= 0 || targetAR <= 0) {
    return full;
  }
  if (natAR > targetAR) {
    // La imagen es más ancha que el área: se recorta a los costados.
    const inset = (1 - targetAR / natAR) / 2;
    return { topLeft: { x: inset, y: 0 }, bottomRight: { x: 1 - inset, y: 1 } };
  }
  // Más alta que el área: se recorta arriba y abajo.
  const inset = (1 - natAR / targetAR) / 2;
  return { topLeft: { x: 0, y: inset }, bottomRight: { x: 1, y: 1 - inset } };
}

/** Quita el bloqueo para poder modificar o borrar el fondo desde el código. */
function unlock(editor: Editor, shape: TLShape): void {
  if (shape.isLocked) editor.toggleLock([shape.id]);
}

/** Lo manda al fondo y lo bloquea, para que no estorbe al seleccionar ni se arrastre. */
function settleBackground(editor: Editor, id: TLShapeId): void {
  editor.sendToBack([id]);
  const shape = editor.getShape(id);
  if (shape && !shape.isLocked) editor.toggleLock([id]);
}

/** El fondo actual de la pieza en la que se está trabajando, o null si no tiene. */
export function getBackground(editor: Editor): StudioBackground | null {
  const shape = findBackgroundShape(editor, resolveFrame(editor));
  if (!shape) return null;
  if (shape.type === 'ultra-box') {
    return { type: 'color', value: (shape as UltraBoxShape).props.color };
  }
  if (shape.type === 'image') {
    const { assetId } = (shape as TLImageShape).props;
    const src = assetId ? editor.getAsset(assetId)?.props.src : null;
    return src ? { type: 'image', value: src } : null;
  }
  return null;
}

/**
 * Pone (o reemplaza) el fondo de la pieza actual. Un cambio de color sobre un fondo de
 * color ya existente se hace **en el mismo shape**: así arrastrar el selector de color
 * no llena el historial de deshacer con un shape nuevo por cada píxel de movimiento.
 */
export async function setBackground(
  editor: Editor,
  background: StudioBackgroundInput,
  canvas: { width: number; height: number },
): Promise<void> {
  const frame = resolveFrame(editor);
  const { w, h } = backgroundRect(frame, canvas);
  const existing = findBackgroundShape(editor, frame);

  if (background.type === 'color') {
    if (existing?.type === 'ultra-box') {
      unlock(editor, existing);
      editor.updateShape({
        id: existing.id,
        type: 'ultra-box',
        props: { w, h, color: background.value },
      });
      settleBackground(editor, existing.id);
      return;
    }
    const id = createShapeId();
    if (existing) removeShape(editor, existing);
    editor.createShape({
      id,
      type: 'ultra-box',
      parentId: frame ? frame.id : undefined,
      x: 0,
      y: 0,
      props: { w, h, color: background.value, kind: 'rect' },
      meta: { ultraRole: BG_ROLE },
    });
    settleBackground(editor, id);
    return;
  }

  // Imagen: se acota el peso antes de incrustarla y se recorta a "cover".
  const encoded = await toJpegDataUrl(background.value, { max: BG_MAX_PX, quality: 0.85 });
  const src = encoded || (typeof background.value === 'string' ? background.value : '');
  if (!src) throw new Error('No se pudo leer la imagen de fondo.');
  const { w: natW, h: natH } = await naturalSize(src);
  const assetId = AssetRecordType.createId(getHashForString(src));
  editor.createAssets([
    {
      id: assetId,
      type: 'image',
      typeName: 'asset',
      meta: {},
      props: {
        w: natW,
        h: natH,
        name: 'fondo.jpg',
        isAnimated: false,
        mimeType: 'image/jpeg',
        src,
      },
    },
  ]);

  const crop = coverCrop(natW, natH, w, h);
  if (existing?.type === 'image') {
    unlock(editor, existing);
    editor.updateShape({ id: existing.id, type: 'image', props: { assetId, w, h, crop } });
    settleBackground(editor, existing.id);
    return;
  }
  if (existing) removeShape(editor, existing);
  const id = createShapeId();
  editor.createShape({
    id,
    type: 'image',
    parentId: frame ? frame.id : undefined,
    x: 0,
    y: 0,
    props: { assetId, w, h, crop },
    meta: { ultraRole: BG_ROLE },
  });
  settleBackground(editor, id);
}

function removeShape(editor: Editor, shape: TLShape): void {
  unlock(editor, shape);
  editor.deleteShapes([shape.id]);
}

/** Saca el fondo de la pieza actual. Devuelve false si no tenía. */
export function clearBackground(editor: Editor): boolean {
  const shape = findBackgroundShape(editor, resolveFrame(editor));
  if (!shape) return false;
  removeShape(editor, shape);
  return true;
}
