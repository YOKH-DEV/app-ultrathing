/**
 * API de plugins del studio. Cada tipo de contenido (gráficos, imagen-IA, docs,
 * video) se registra como un `StudioPlugin` con sus shapes/tools/UI propios, sin
 * tocar el core del canvas. Mismo espíritu que el registro de features del engine.
 */
import type {
  TLAnyShapeUtilConstructor,
  TLStateNodeConstructor,
  TLUiOverrides,
} from './sdk';

export interface StudioPlugin {
  /** Identificador único del plugin (ej. 'ai-image', 'doc', 'video'). */
  id: string;
  /** Shapes personalizados que aporta este plugin. */
  shapeUtils?: TLAnyShapeUtilConstructor[];
  /** Herramientas (tools) que aporta este plugin. */
  tools?: TLStateNodeConstructor[];
  /** Override de la UI de tldraw (tools/actions/menús) que aporta este plugin. */
  ui?: (overrides: TLUiOverrides) => TLUiOverrides;
}

/** Aplana los shapeUtils de todos los plugins en un solo array para `<Tldraw>`. */
export function collectShapeUtils(plugins: StudioPlugin[]): TLAnyShapeUtilConstructor[] {
  return plugins.flatMap((p) => p.shapeUtils ?? []);
}

/** Aplana los tools de todos los plugins en un solo array para `<Tldraw>`. */
export function collectTools(plugins: StudioPlugin[]): TLStateNodeConstructor[] {
  return plugins.flatMap((p) => p.tools ?? []);
}

/** Compone los overrides de UI de todos los plugins en uno solo. */
export function composeUiOverrides(plugins: StudioPlugin[]): TLUiOverrides {
  return plugins.reduce<TLUiOverrides>((acc, p) => (p.ui ? p.ui(acc) : acc), {});
}
