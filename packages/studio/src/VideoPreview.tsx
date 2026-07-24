/**
 * Preview de video dentro del studio. Reproduce la MISMA composición que renderiza el
 * motor (`DesignVideo`) con los mismos props y duración, así lo que ves acá es
 * exactamente lo que va a salir en el mp4 — sin esperar el render.
 */
import { Player } from '@remotion/player';
import {
  DesignVideo,
  VIDEO_FPS,
  videoDurationInFrames,
  type VideoElement,
} from './video';

export interface VideoPreviewProps {
  elements: VideoElement[];
  background?: string;
  width: number;
  height: number;
  /** Frames entre la entrada de un elemento y el siguiente (igual que en el render). */
  stagger?: number;
}

export function VideoPreview({
  elements,
  background = '#111111',
  width,
  height,
  stagger = 10,
}: VideoPreviewProps) {
  const durationInFrames = videoDurationInFrames(elements.length, stagger);
  return (
    <Player
      component={DesignVideo}
      inputProps={{ elements, background, stagger, width, height }}
      durationInFrames={durationInFrames}
      fps={VIDEO_FPS}
      compositionWidth={width}
      compositionHeight={height}
      style={{ width: '100%', height: '100%' }}
      controls
      autoPlay
      loop
    />
  );
}
