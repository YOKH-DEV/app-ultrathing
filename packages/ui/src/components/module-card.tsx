import { type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

/** Tarjeta de módulo del "Centro de Comando": ícono dorado + hover con halo. */
export function ModuleCard({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex w-full flex-col items-start gap-3 rounded border border-line bg-surface p-5 text-left',
        'transition-all hover:border-gold-deep hover:shadow-glow disabled:opacity-40',
      )}
    >
      <span className="rounded-lg bg-elevated p-2.5 text-gold transition-colors group-hover:bg-[var(--gold-glow)]">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <span className="font-display text-base text-text">{title}</span>
      <span className="text-sm text-text-muted">{description}</span>
    </button>
  );
}
