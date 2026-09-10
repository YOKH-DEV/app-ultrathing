/**
 * Monta una plantilla del pack (core) como shapes en el lienzo.
 * Las recetas son nuestras (no Canva): bloques + textos listos para editar.
 */
import { templateById, presetById, type TemplateKind } from '@ultrathing/core';
import { traceToShapes, type StudioTrace, type StudioTraceElement } from './tracing';
import type { Editor } from './sdk';

function rect(x: number, y: number, w: number, h: number, fill: string): StudioTraceElement {
  return { kind: 'rect', x, y, w, h, fill };
}

function text(
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  color: string,
  weight = 700,
): StudioTraceElement {
  return {
    kind: 'text',
    x,
    y,
    w,
    h,
    text: value,
    color,
    font_size: h,
    font_weight: weight,
    overlay: false,
  };
}

function layout(kind: TemplateKind, w: number, h: number): StudioTraceElement[] {
  const m = Math.round(Math.min(w, h) * 0.06);
  switch (kind) {
    case 'promo':
      return [
        rect(0, 0, w, h, '#111111'),
        rect(0, 0, w, Math.round(h * 0.1), '#d4af37'),
        text(m, Math.round(h * 0.14), w - m * 2, Math.round(h * 0.06), 'TU MARCA', '#d4af37', 700),
        text(m, Math.round(h * 0.32), w - m * 2, Math.round(h * 0.16), 'OFERTA', '#f5efe0', 700),
        text(m, Math.round(h * 0.52), w - m * 2, Math.round(h * 0.08), 'Subtítulo de la pieza', '#c4b59a', 400),
        rect(m, h - m - Math.round(h * 0.1), w - m * 2, Math.round(h * 0.1), '#d4af37'),
        text(m, h - m - Math.round(h * 0.1), w - m * 2, Math.round(h * 0.1), 'Call to action', '#111111', 700),
      ];
    case 'quote':
      return [
        rect(0, 0, w, h, '#f5efe0'),
        text(m, Math.round(h * 0.28), w - m * 2, Math.round(h * 0.22), '“Una frase que se recuerde.”', '#111111', 700),
        text(m, Math.round(h * 0.58), w - m * 2, Math.round(h * 0.07), '— Tu nombre', '#8a7a5c', 400),
      ];
    case 'story':
      return [
        rect(0, 0, w, h, '#111111'),
        rect(0, 0, w, Math.round(h * 0.015), '#d4af37'),
        text(m, Math.round(h * 0.12), w - m * 2, Math.round(h * 0.05), 'SERIE / CAPÍTULO', '#d4af37', 700),
        text(m, Math.round(h * 0.38), w - m * 2, Math.round(h * 0.14), 'Título de portada', '#f5efe0', 700),
        text(m, h - Math.round(h * 0.18), w - m * 2, Math.round(h * 0.05), 'Deslizá para ver más', '#c4b59a', 400),
      ];
    case 'thumb':
      return [
        rect(0, 0, w, h, '#111111'),
        rect(0, 0, Math.round(w * 0.02), h, '#ff3b30'),
        text(m * 1.4, Math.round(h * 0.22), w - m * 3, Math.round(h * 0.28), 'TÍTULO DEL VIDEO', '#ffffff', 700),
        text(m * 1.4, Math.round(h * 0.58), w - m * 3, Math.round(h * 0.12), 'Clickbait honesto', '#d4af37', 400),
      ];
    case 'hero':
      return [
        rect(0, 0, w, h, '#0f172a'),
        text(m, Math.round(h * 0.32), w - m * 2, Math.round(h * 0.16), 'Título de la pieza', '#f5efe0', 700),
        text(m, Math.round(h * 0.52), w - m * 2, Math.round(h * 0.08), 'Una línea que explique el valor', '#d4af37', 400),
      ];
    default:
      return [];
  }
}

/** Aplica la plantilla al editor. `blank` no hace nada (lienzo vacío del tamaño ya creado). */
export function applyDesignTemplate(editor: Editor, templateId: string, width: number, height: number): number {
  const tpl = templateById(templateId);
  if (!tpl || tpl.kind === 'blank') return 0;
  const preset = presetById(tpl.presetId);
  const w = width || preset?.width || 1080;
  const h = height || preset?.height || 1080;
  const trace: StudioTrace = {
    width: w,
    height: h,
    background: null,
    palette: ['#d4af37', '#111111', '#f5efe0'],
    elements: layout(tpl.kind, w, h),
  };
  return traceToShapes(editor, trace);
}
