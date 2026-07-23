/**
 * Custom shapes de UltraThing con COLOR HEX EXACTO. Las shapes nativas de tldraw usan
 * una paleta nombrada (pierden el color real); estas guardan el hex tal cual, que es lo
 * que necesita "imagen → editable" y la edición de color fiel.
 *
 * Se registran en el sistema de tipos aumentando `TLGlobalShapePropsMap` (el mecanismo
 * oficial de tldraw para custom shapes) y se montan vía el StudioPlugin de abajo.
 */
import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  stopEventPropagation,
  T,
  useEditor,
  type Geometry2d,
  type RecordProps,
  type TLResizeInfo,
  type TLShape,
} from './sdk';
import type { StudioPlugin } from './plugins';

interface UltraBoxProps {
  w: number;
  h: number;
  color: string;
  kind: 'rect' | 'ellipse';
}

interface UltraTextProps {
  w: number;
  h: number;
  text: string;
  color: string;
  fontSize: number;
  align: 'left' | 'center' | 'right';
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    'ultra-box': UltraBoxProps;
    'ultra-text': UltraTextProps;
  }
}

export type UltraBoxShape = TLShape<'ultra-box'>;
export type UltraTextShape = TLShape<'ultra-text'>;

function rectIndicator(w: number, h: number): Path2D {
  const p = new Path2D();
  p.rect(0, 0, w, h);
  return p;
}

// ---- UltraBox: rectángulo/elipse con relleno hex exacto ----
export class UltraBoxUtil extends ShapeUtil<UltraBoxShape> {
  static override type = 'ultra-box' as const;
  static override props: RecordProps<UltraBoxShape> = {
    w: T.number,
    h: T.number,
    color: T.string,
    kind: T.literalEnum('rect', 'ellipse'),
  };

  getDefaultProps(): UltraBoxShape['props'] {
    return { w: 120, h: 80, color: '#d4af37', kind: 'rect' };
  }

  getGeometry(shape: UltraBoxShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override onResize(shape: UltraBoxShape, info: TLResizeInfo<UltraBoxShape>) {
    return resizeBox(shape, info);
  }

  component(shape: UltraBoxShape) {
    const { w, h, color, kind } = shape.props;
    return (
      <HTMLContainer
        style={{
          width: w,
          height: h,
          backgroundColor: color,
          borderRadius: kind === 'ellipse' ? '50%' : 0,
          pointerEvents: 'all',
        }}
      />
    );
  }

  getIndicatorPath(shape: UltraBoxShape): Path2D {
    return rectIndicator(shape.props.w, shape.props.h);
  }
}

// ---- UltraText: texto con color hex exacto, tamaño en px y edición inline ----
export class UltraTextUtil extends ShapeUtil<UltraTextShape> {
  static override type = 'ultra-text' as const;
  static override props: RecordProps<UltraTextShape> = {
    w: T.number,
    h: T.number,
    text: T.string,
    color: T.string,
    fontSize: T.number,
    align: T.literalEnum('left', 'center', 'right'),
  };

  getDefaultProps(): UltraTextShape['props'] {
    return { w: 220, h: 44, text: 'Texto', color: '#111111', fontSize: 24, align: 'left' };
  }

  getGeometry(shape: UltraTextShape): Geometry2d {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override onResize(shape: UltraTextShape, info: TLResizeInfo<UltraTextShape>) {
    return resizeBox(shape, info);
  }

  override canEdit() {
    return true;
  }

  component(shape: UltraTextShape) {
    const editor = useEditor();
    const isEditing = editor.getEditingShapeId() === shape.id;
    const { w, h, text, color, fontSize, align } = shape.props;
    const base = {
      width: w,
      height: h,
      color,
      fontSize,
      lineHeight: 1.2,
      textAlign: align,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 700,
    } as const;

    if (isEditing) {
      return (
        <HTMLContainer>
          <textarea
            autoFocus
            value={text}
            onChange={(e) =>
              editor.updateShape({
                id: shape.id,
                type: 'ultra-text',
                props: { text: e.target.value },
              })
            }
            onPointerDown={stopEventPropagation}
            style={{
              ...base,
              margin: 0,
              padding: 0,
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              pointerEvents: 'all',
            }}
          />
        </HTMLContainer>
      );
    }

    return (
      <HTMLContainer
        style={{
          ...base,
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {text}
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape: UltraTextShape): Path2D {
    return rectIndicator(shape.props.w, shape.props.h);
  }
}

/** Plugin con los custom shapes de color exacto. Se registra por defecto en <Studio>. */
export const ultraShapesPlugin: StudioPlugin = {
  id: 'ultra-shapes',
  shapeUtils: [UltraBoxUtil, UltraTextUtil],
};
