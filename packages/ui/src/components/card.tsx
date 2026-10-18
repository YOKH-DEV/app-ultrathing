import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Contenedor base con glassmorphism: superficie translúcida, desenfoque y borde luminoso. */
export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5',
      'shadow-[var(--glow-soft)] backdrop-blur-[var(--glass-blur)]',
      className,
    )}
    {...props}
  />
);
