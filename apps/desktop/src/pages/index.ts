import { type ComponentType } from 'react';
import { DownloaderPage } from './DownloaderPage';
import { ImagePage } from './ImagePage';
import { FilesPage } from './FilesPage';

/**
 * Páginas de módulos ya construidos, indexadas por `route`.
 * Un feature del registro sin entrada aquí cae en `ComingSoon`.
 */
export const pageByRoute: Record<string, ComponentType> = {
  '/downloader': DownloaderPage,
  '/image': ImagePage,
  '/files': FilesPage,
};
