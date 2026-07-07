import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded font-medium transition-all ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-gold text-[var(--on-gold)] hover:bg-gold-bright',
        ghost: 'bg-transparent text-text hover:bg-hover',
        outline: 'border border-line-strong text-text hover:border-gold hover:text-gold',
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
