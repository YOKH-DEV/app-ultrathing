import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40',
  {
    variants: {
      variant: {
        // Botón dorado con halo luminoso (se intensifica al pasar el mouse).
        primary:
          'bg-gold text-[var(--on-gold)] shadow-[var(--glow-gold)] hover:bg-gold-bright ' +
          'hover:shadow-[0_0_34px_rgba(229,185,78,0.5)]',
        ghost: 'bg-transparent text-text hover:bg-[var(--glass-strong)]',
        outline:
          'border border-[var(--glass-border)] bg-[var(--glass-bg)] text-text backdrop-blur-[var(--glass-blur)] ' +
          'hover:border-gold hover:text-gold',
      },
      size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
