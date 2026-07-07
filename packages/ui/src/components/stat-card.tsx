import { cn } from '../lib/cn';

/** Métrica de dashboard: etiqueta arriba, número grande abajo. */
export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-line bg-surface p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={cn('mt-1 font-display text-2xl text-text')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-faint">{hint}</p>}
    </div>
  );
}
