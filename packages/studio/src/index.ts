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
  downloadBlob,
} from './persistence';
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
