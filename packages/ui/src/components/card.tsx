import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Contenedor base: superficie oscura con borde sutil. */
export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('rounded border border-line bg-surface p-5', className)}
    {...props}
  />
);
