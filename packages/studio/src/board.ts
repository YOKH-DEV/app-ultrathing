/**
 * Tablero multi-diseño: "bloques" (frames de tldraw) que conviven en un mismo lienzo,
 * como en Canva/Figma. Cada bloque es una pieza independiente que se ve junto a las
 * demás y se exporta por separado — por diseños (PNG en un ZIP) o por hojas (PDF).
 */
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import {
  AssetRecordType,
  createShapeId,
  getHashForString,
  type Editor,
  type TLFrameShape,
  type TLShapeId,
} from './sdk';
import { blobToDataUrl, naturalSize, toJpegDataUrl } from './raster';

/** Los bloques (frames) del lienzo actual, en orden. */
export function getBlocks(editor: Editor): TLFrameShape[] {
  return editor
    .getCurrentPageShapes()
    .filter((s): s is TLFrameShape => s.type === 'frame');
}

/** Punto de inserción a la derecha del contenido existente (para no encimar bloques). */
function nextSlot(editor: Editor): { x: number; y: number } {
  const bounds = editor.getCurrentPageBounds();
  return bounds ? { x: bounds.maxX + 80, y: bounds.minY } : { x: 0, y: 0 };
}

/**
 * Agrega un bloque vacío (frame) del tamaño dado, a la derecha de lo que haya, y lo deja
 * seleccionado. Ahí adentro se arma una pieza (imagen → editable, generar, etc.).
 */
export function addBlock(editor: Editor, w: number, h: number, name = 'Diseño'): TLShapeId {
  const { x, y } = nextSlot(editor);
  const id = createShapeId();
  editor.createShape({ id, type: 'frame', x, y, props: { w, h, name } });
  editor.select(id);
  editor.zoomToFit({ animation: { duration: 200 } });
  return id;
}

/**
 * Sube varias imágenes al tablero: cada una entra como su propio bloque (frame con la
 * imagen dentro), acomodadas en fila. Así se editan todas juntas y se exportan separadas.
 */
export async function addImageBlocks(editor: Editor, files: File[]): Promise<number> {
  let { x, y } = nextSlot(editor);
  let created = 0;
  for (const file of files) {
    const src = await blobToDataUrl(file);
    if (!src) continue;
    const { w: natW, h: natH } = await naturalSize(src);
    const max = 800;
    const scale = Math.min(1, max / Math.max(natW, natH));
    const w = Math.max(1, Math.round(natW * scale));
    const h = Math.max(1, Math.round(natH * scale));

    const frameId = createShapeId();
    const name = file.name.replace(/\.[^.]+$/, '') || `Imagen ${created + 1}`;
    editor.createShape({ id: frameId, type: 'frame', x, y, props: { w, h, name } });

    const assetId = AssetRecordType.createId(getHashForString(src));
    editor.createAssets([
      {
        id: assetId,
        type: 'image',
        typeName: 'asset',
        meta: {},
        props: { w: natW, h: natH, name: file.name, isAnimated: false, mimeType: file.type || 'image/png', src },
      },
    ]);
    editor.createShape({
      id: createShapeId(),
      type: 'image',
      parentId: frameId,
      x: 0,
      y: 0,
      props: { assetId, w, h },
    });

    x += w + 80;
    created++;
  }
  if (created) editor.zoomToFit({ animation: { duration: 200 } });
  return created;
}

/** Nombre de archivo seguro para un bloque. */
function blockName(frame: TLFrameShape, i: number): string {
  const raw = (frame.props.name || `diseno-${i + 1}`).trim();
  return raw.replace(/[^\w.-]+/g, '_') || `diseno-${i + 1}`;
}

/**
 * "Por diseños": cada bloque como PNG independiente, empaquetados en un ZIP.
 * Devuelve null si no hay bloques en el lienzo.
 */
export async function exportBlocksZip(editor: Editor): Promise<Blob | null> {
  const frames = getBlocks(editor);
  if (!frames.length) return null;
  const zip = new JSZip();
  const seen = new Map<string, number>();
  for (let i = 0; i < frames.length; i++) {
    const res = await editor.toImage([frames[i].id], { format: 'png', background: true, scale: 2 });
    if (!res?.blob) continue;
    let name = blockName(frames[i], i);
    const dup = seen.get(name) ?? 0; // evita colisiones de nombre en el ZIP
    seen.set(name, dup + 1);
    if (dup) name = `${name}-${dup + 1}`;
    zip.file(`${name}.png`, res.blob);
  }
  return zip.generateAsync({ type: 'blob' });
}

/**
 * "Por hojas": un PDF con cada bloque en su propia hoja (del tamaño del bloque), listo
 * para imprimir. Devuelve null si no hay bloques.
 */
export async function exportBlocksPdf(editor: Editor): Promise<Blob | null> {
  const frames = getBlocks(editor);
  if (!frames.length) return null;
  let pdf: jsPDF | null = null;
  for (const f of frames) {
    const res = await editor.toImage([f.id], { format: 'png', background: true, scale: 2 });
    if (!res?.blob) continue;
    // JPEG de alta calidad: mantiene nitidez de impresión y evita PDFs de decenas de MB.
    const dataUrl = await toJpegDataUrl(res.blob, { quality: 0.9 });
    if (!dataUrl) continue;
    const w = Math.max(1, Math.round(f.props.w));
    const h = Math.max(1, Math.round(f.props.h));
    const orientation = w >= h ? 'l' : 'p';
    if (!pdf) pdf = new jsPDF({ orientation, unit: 'px', format: [w, h], compress: true });
    else pdf.addPage([w, h], orientation);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, w, h);
  }
  return pdf ? (pdf.output('blob') as Blob) : null;
}
