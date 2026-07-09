import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Une clases y resuelve conflictos de Tailwind. Úsalo en todos los componentes. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
