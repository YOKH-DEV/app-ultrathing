import { type Feature } from '@ultrathing/core';
import { Card } from '@ultrathing/ui';

/** Página genérica para features registrados cuyo módulo aún no se construye. */
export function ComingSoon({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-text">{feature.name}</h2>
      <p className="mb-6 text-sm text-text-muted">{feature.description}</p>

      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="rounded-lg bg-elevated p-3 text-gold">
          <Icon size={28} strokeWidth={1.5} />
        </span>
        <p className="font-display text-text">Próximamente</p>
        <p className="max-w-xs text-sm text-text-faint">
          Este módulo se activa en una fase futura del roadmap.
        </p>
      </Card>
    </div>
  );
}
