/**
 * Helpers para las acciones de IA sobre texto del lienzo (slice 2 de Fase B).
 * Aíslan a la app del tipo interno del custom shape `ultra-text`: la app lee el texto
 * seleccionado, se lo manda al copywriter del motor, y escribe la respuesta de vuelta.
 */
import type { Editor, TLShapeId } from './sdk';
import type { UltraTextShape } from './shapes';

/** Devuelve el texto del único `ultra-text` seleccionado, o null si no hay exactamente uno. */
export function getSelectedText(editor: Editor): { id: TLShapeId; text: string } | null {
  const shapes = editor.getSelectedShapes();
  if (shapes.length !== 1) return null;
  const shape = shapes[0];
  if (shape.type !== 'ultra-text') return null;
  return { id: shape.id, text: (shape as UltraTextShape).props.text };
}

/** Reemplaza el texto de un `ultra-text` (resultado de una acción de IA). */
export function setText(editor: Editor, id: TLShapeId, text: string): void {
  editor.updateShape({ id, type: 'ultra-text', props: { text } });
}
