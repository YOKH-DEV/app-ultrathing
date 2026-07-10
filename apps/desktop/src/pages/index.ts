import { type ComponentType } from 'react';
import { DownloaderPage } from './DownloaderPage';

/**
 * Páginas de módulos ya construidos, indexadas por `route`.
 * Un feature del registro sin entrada aquí cae en `ComingSoon`.
 */
export const pageByRoute: Record<string, ComponentType> = {
  '/downloader': DownloaderPage,
};
