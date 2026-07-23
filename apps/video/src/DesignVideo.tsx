import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/** Mismo contrato de elementos que el tracer/design del motor: un solo idioma para
 * lienzo (tldraw), IA y video. Coordenadas en px del diseño. */
export interface VideoElement {
  kind: 'text' | 'rect' | 'ellipse' | 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string | null;
  font_size?: number | null;
  color?: string | null;
  fill?: string | null;
  src?: string | null;
}

export interface DesignVideoProps {
  elements: VideoElement[];
  background: string;
  /** Frames de retraso entre la entrada de un elemento y el siguiente. */
  stagger: number;
  /** Tamaño del diseño; lo usa calculateMetadata para el lienzo del video. */
  width?: number;
  height?: number;
}

/** Anima una pieza: cada elemento entra escalonado con fade + leve desplazamiento. */
export const DesignVideo: React.FC<DesignVideoProps> = ({ elements, background, stagger }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      {elements.map((el, i) => {
        const start = i * stagger;
        const local = frame - start;
        const appear = spring({ frame: local, fps, config: { damping: 200 }, durationInFrames: 20 });
        const opacity = interpolate(local, [0, 12], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const dy = interpolate(appear, [0, 1], [24, 0]);
        const style: React.CSSProperties = {
          position: 'absolute',
          left: el.x,
          top: el.y,
          width: el.w,
          height: el.h,
          opacity,
          transform: `translateY(${dy}px)`,
        };

        if (el.kind === 'image' && el.src) {
          return <Img key={i} src={el.src} style={{ ...style, objectFit: 'cover' }} />;
        }
        if (el.kind === 'rect' || el.kind === 'ellipse') {
          return (
            <div
              key={i}
              style={{
                ...style,
                backgroundColor: el.fill ?? '#d4af37',
                borderRadius: el.kind === 'ellipse' ? '50%' : 0,
              }}
            />
          );
        }
        return (
          <div
            key={i}
            style={{
              ...style,
              color: el.color ?? '#111111',
              fontSize: el.font_size ?? 40,
              fontWeight: 700,
              fontFamily: 'Inter, system-ui, sans-serif',
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'pre-wrap',
            }}
          >
            {el.text ?? ''}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
