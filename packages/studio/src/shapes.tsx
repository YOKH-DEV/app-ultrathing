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
  // --- Overlay no destructivo (imagen → editable) ---
  overlay: boolean; // true → invisible hasta editar, para dejar ver el original debajo
  bgColor: string; // color de fondo local (parche plano de respaldo); '' si no aplica
  patch: string; // dataURL del recorte de fondo local que tapa el texto original; '' si no
  fontFamily: string; // familia detectada ('serif'/'sans-serif' o concreta); '' → default
  fontWeight: number; // peso aproximado (400/700)
  edited: boolean; // el overlay ya fue materializado (el usuario lo editó)
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
    overlay: T.boolean,
    bgColor: T.string,
    patch: T.string,
    fontFamily: T.string,
    fontWeight: T.number,
    edited: T.boolean,
  };

  getDefaultProps(): UltraTextShape['props'] {
    return {
      w: 220,
      h: 44,
      text: 'Texto',
      color: '#111111',
      fontSize: 24,
      align: 'left',
      overlay: false,
      bgColor: '',
      patch: '',
      fontFamily: '',
      fontWeight: 700,
      edited: false,
    };
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
    const { w, h, text, color, fontSize, align, overlay, bgColor, patch, fontFamily, fontWeight, edited } =
      shape.props;

    // Un overlay del tracer se "materializa" (pinta) solo cuando el usuario lo edita.
    // Hasta entonces se ve el pixel original debajo (tipografía real incluida).
    const materialized = !overlay || edited || isEditing;

    const family =
      fontFamily && fontFamily.length
        ? fontFamily === 'serif'
          ? 'Georgia, "Times New Roman", serif'
          : fontFamily === 'sans-serif'
            ? 'Inter, system-ui, sans-serif'
            : // Familia concreta detectada por IA (Google Font): con fallback genérico
              // por si la hoja de estilo todavía no terminó de cargar.
              `"${fontFamily}", Inter, system-ui, sans-serif`
        : 'Inter, system-ui, sans-serif';

    const base = {
      width: w,
      height: h,
      color,
      fontSize,
      lineHeight: 1.2,
      textAlign: align,
      fontFamily: family,
      fontWeight: fontWeight || 700,
    } as const;

    // Fondo que tapa el texto original al materializar (solo overlays del tracer):
    // el recorte `patch` reproduce el fondo local exacto; si no hay, cae al color plano.
    const cover =
      overlay && materialized
        ? patch
          ? {
              backgroundImage: `url(${patch})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }
          : bgColor
            ? { backgroundColor: bgColor }
            : {}
        : {};

    // Overlay aún sin tocar: invisible (se ve el original). La caja sigue existiendo como
    // geometría, así tldraw muestra el contorno al pasar el mouse y permite editar.
    if (overlay && !materialized) {
      return <HTMLContainer style={{ width: w, height: h, opacity: 0, pointerEvents: 'none' }} />;
    }

    if (isEditing) {
      return (
        <HTMLContainer style={{ width: w, height: h, ...cover }}>
          <textarea
            autoFocus
            value={text}
            onChange={(e) =>
              editor.updateShape({
                id: shape.id,
                type: 'ultra-text',
                props: { text: e.target.value, edited: true },
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
      <HTMLContainer style={{ width: w, height: h, ...cover, pointerEvents: 'none' }}>
        <div
          style={{
            ...base,
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
          }}
        >
          {text}
        </div>
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
