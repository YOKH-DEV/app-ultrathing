import type Konva from 'konva';

/** ¿Corremos dentro de la ventana Tauri (no en el navegador de desarrollo)? */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * PNG del Stage como dataURL. El Stage está escalado a pantalla (scaleX<1); se
 * compensa con pixelRatio. Sin `maxWidth` → resolución real del diseño. Con
 * `maxWidth` → miniatura de ese ancho (para la galería).
 */
export function stageToPngDataUrl(stage: Konva.Stage, maxWidth?: number): string {
  const pixelRatio =
    maxWidth !== undefined ? maxWidth / stage.width() : 1 / (stage.scaleX() || 1);
  return stage.toDataURL({ mimeType: 'image/png', pixelRatio });
}

/** dataURL "data:...;base64,XXXX" → bytes. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Guarda un PNG (dataURL). En Tauri abre "Guardar como…" (dialog.save) y escribe con
 * fs.writeFile; en navegador dispara una descarga `<a download>`. Devuelve true si se
 * guardó, false si el usuario canceló el diálogo.
 */
export async function savePng(dataUrl: string, suggestedName: string): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({
      defaultPath: suggestedName,
      filters: [{ name: 'Imagen PNG', extensions: ['png'] }],
    });
    if (!path) return false; // cancelado
    await writeFile(path, dataUrlToBytes(dataUrl));
    return true;
  }
  // Navegador: descarga estándar.
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}
