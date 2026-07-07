import type { LucideIcon } from 'lucide-react';
import type { Surface } from './types';

/** Un feature del Centro de Comando. Registrar uno = añadirlo a la app. */
export interface Feature {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  surface: Surface;
  route: string;
}

const registry = new Map<string, Feature>();

export function registerFeature(f: Feature): Feature {
  if (registry.has(f.id)) throw new Error(`Feature duplicado: ${f.id}`);
  registry.set(f.id, f);
  return f;
}

/** El shell pide solo los features que corresponden a su plataforma. */
export function featuresFor(surface: 'desktop' | 'web'): Feature[] {
  return [...registry.values()].filter(
    (f) => f.surface === 'both' || f.surface === surface,
  );
}
