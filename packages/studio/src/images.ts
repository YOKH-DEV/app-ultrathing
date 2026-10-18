/**
 * Helper para incrustar una imagen (dataURL) en el lienzo como shape editable de tldraw.
 * Lo usa la generación de imágenes con IA (slice 4): prompt → imagen → al canvas.
 */
import { AssetRecordType, createShapeId, getHashForString, type Editor, type TLShapeId } from './sdk';
import { naturalSize } from './raster';

/**
 * Inserta una imagen (dataURL) centrada en la vista actual, escalada a un tamaño
 * cómodo, y la deja seleccionada. Devuelve el id del shape creado.
 */
export async function addImage(editor: Editor, src: string): Promise<void> {
  const { w: natW, h: natH } = await naturalSize(src);
  const max = 700;
  const scale = Math.min(1, max / Math.max(natW, natH));
  const w = Math.round(natW * scale);
  const h = Math.round(natH * scale);

  const assetId = AssetRecordType.createId(getHashForString(src));
  editor.createAssets([
    {
      id: assetId,
      type: 'image',
      typeName: 'asset',
      meta: {},
      props: { w: natW, h: natH, name: 'ia.png', isAnimated: false, mimeType: 'image/png', src },
    },
  ]);

  const center = editor.getViewportPageBounds().center;
  const id = createShapeId();
  editor.createShape({
    id,
    type: 'image',
    x: center.x - w / 2,
    y: center.y - h / 2,
    props: { assetId, w, h },
  });
  editor.select(id);
}

/**
 * Reemplaza EN EL MISMO LUGAR la imagen de un shape (misma posición y tamaño) por otra
 * versión (dataURL) — p. ej. la misma foto sin fondo. No mueve ni redimensiona: solo
 * cambia los píxeles. Devuelve true si reemplazó, false si el shape no era una imagen.
 */
export async function replaceImageSrc(
  editor: Editor,
  shapeId: TLShapeId,
  src: string,
): Promise<boolean> {
  const shape = editor.getShape(shapeId);
  if (!shape || shape.type !== 'image') return false;
  const { w: natW, h: natH } = await naturalSize(src);
  const assetId = AssetRecordType.createId(getHashForString(src));
  editor.createAssets([
    {
      id: assetId,
      type: 'image',
      typeName: 'asset',
      meta: {},
      props: { w: natW, h: natH, name: 'sin-fondo.png', isAnimated: false, mimeType: 'image/png', src },
    },
  ]);
  editor.updateShape({ id: shapeId, type: 'image', props: { assetId } });
  return true;
}
