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
  // Idempotente: al recargar en caliente (HMR) el módulo de features se re-ejecuta y
  // vuelve a registrar los mismos ids; sobrescribir (en vez de lanzar) evita romper el
  // registro y que un módulo recién añadido no aparezca hasta reiniciar la app.
  registry.set(f.id, f);
  return f;
}

/** El shell pide solo los features que corresponden a su plataforma. */
export function featuresFor(surface: 'desktop' | 'web'): Feature[] {
  return [...registry.values()].filter(
    (f) => f.surface === 'both' || f.surface === surface,
  );
}
