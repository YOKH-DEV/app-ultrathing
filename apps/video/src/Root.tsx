import { Composition } from 'remotion';
import { DesignVideo, type DesignVideoProps } from './DesignVideo';

const FPS = 30;

/** Duración: base + un tramo por elemento, para que todos alcancen a entrar. */
function durationFor(props: DesignVideoProps): number {
  const tail = 2 * FPS; // 2s de aire al final
  return Math.max(3 * FPS, props.elements.length * props.stagger + tail);
}

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Design"
    component={DesignVideo}
    fps={FPS}
    width={1080}
    height={1350}
    durationInFrames={5 * FPS}
    defaultProps={
      { elements: [], background: '#111111', stagger: 10, width: 1080, height: 1350 } as DesignVideoProps
    }
    // El motor manda el tamaño real del diseño y los elementos por --props.
    calculateMetadata={({ props }) => ({
      durationInFrames: durationFor(props),
      width: props.width ?? 1080,
      height: props.height ?? 1350,
    })}
  />
);
