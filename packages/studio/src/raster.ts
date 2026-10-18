/**
 * Helpers de imagen rasterizada del studio (entorno navegador): medir, leer y reducir.
 *
 * Viven acá porque el mismo `new Image()` lo necesitan todos los módulos que tocan
 * píxeles — fondo del lienzo, bloques del tablero, miniatura de la galería y export —
 * y tenerlo repetido en cada uno ya había producido tres copias de `naturalSize`.
 */

/** Dimensiones naturales de una imagen a partir de su URL/dataURL. */
export function naturalSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 512, h: 512 });
    img.src = src;
  });
}

/** Lee un File/Blob como dataURL. Devuelve '' si no se pudo leer. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => resolve('');
    r.readAsDataURL(blob);
  });
}

export interface JpegOptions {
  /** Lado mayor máximo en px. Por defecto no reduce. */
  max?: number;
  /** Calidad JPEG 0-1. */
  quality?: number;
}

/**
 * Convierte una imagen (Blob o dataURL) a dataURL **JPEG**, opcionalmente reducida para
 * que su lado mayor no pase de `max` px.
 *
 * Por qué JPEG: un PNG se embebe sin comprimir y dispara el peso de lo que lo contenga
 * (el PDF de un solo bloque llegó a pesar decenas de MB; el snapshot que se guarda en
 * Supabase lleva las imágenes incrustadas como dataURL). Se pinta sobre blanco porque
 * el JPEG no tiene canal alfa. Devuelve '' si el navegador no pudo decodificarla.
 */
export function toJpegDataUrl(
  source: Blob | string,
  { max = Infinity, quality = 0.9 }: JpegOptions = {},
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source);
    const done = (value: string) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(value);
    };
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
      }
      done(ctx ? canvas.toDataURL('image/jpeg', quality) : '');
    };
    img.onerror = () => done('');
    img.src = objectUrl ?? (source as string);
  });
}
