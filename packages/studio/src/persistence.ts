/**
 * Puente de persistencia y exportación del studio.
 *
 * El documento se guarda como el snapshot de tldraw (`editor.getSnapshot()`), que
 * incluye `document` (shapes/páginas/assets — la fuente de verdad, va a Supabase) y
 * `session` (cámara/selección — se puede descartar o cachear local). La app decide
 * dónde persistir; el studio solo produce/consume el snapshot.
 */
import type { Editor, TLEditorSnapshot } from './sdk';

/** El documento reutilizable/portable de un diseño = snapshot de tldraw. */
export type StudioDocument = TLEditorSnapshot;

/**
 * ¿El valor guardado es un snapshot del studio (tldraw) y no un formato viejo?
 * Los diseños konva antiguos son un array de elementos; estos, un objeto con
 * `document`. Sirve para no intentar cargar basura en el store.
 */
export function isStudioDocument(value: unknown): value is StudioDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'document' in (value as Record<string, unknown>)
  );
}

/** Exporta el diseño completo como PNG (Blob). Fondo incluido. */
export async function exportPng(editor: Editor): Promise<Blob | null> {
  const ids = [...editor.getCurrentPageShapeIds()];
  if (ids.length === 0) return null;
  const result = await editor.toImage(ids, { format: 'png', background: true, scale: 2 });
  return result?.blob ?? null;
}

/** Dispara la descarga de un Blob con el nombre dado (entorno navegador). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
