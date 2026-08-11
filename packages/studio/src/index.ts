/**
 * `@ultrathing/studio` — el studio de diseño reutilizable de UltraThing.
 * API pública. El motor (tldraw) queda detrás del facade `./sdk`; los plugins de
 * cada tipo de contenido se importan desde `@ultrathing/studio/sdk`.
 */
export { Studio, type StudioProps } from './Studio';
export {
  type StudioPlugin,
  collectShapeUtils,
  collectTools,
  composeUiOverrides,
} from './plugins';
export {
  type StudioDocument,
  isStudioDocument,
  exportPng,
  exportThumbnail,
  downloadBlob,
} from './persistence';
export {
  getBlocks,
  addBlock,
  addImageBlocks,
  exportBlocksZip,
  exportBlocksPdf,
} from './board';
export {
  type StudioBackground,
  type StudioBackgroundInput,
  getBackground,
  setBackground,
  clearBackground,
} from './background';
export {
  traceToShapes,
  type StudioTrace,
  type StudioTraceElement,
} from './tracing';
export {
  ultraShapesPlugin,
  UltraBoxUtil,
  UltraTextUtil,
  type UltraBoxShape,
  type UltraTextShape,
} from './shapes';
export { getSelectedText, setText } from './text-actions';
export { addImage, replaceImageSrc } from './images';
export { ensureFont } from './fonts';
export { canvasToTrace } from './canvas-export';
export { VideoPreview, type VideoPreviewProps, type PlayerRef } from './VideoPreview';
export { DesignVideo, VIDEO_FPS, videoDurationInFrames, type VideoElement } from './video';
