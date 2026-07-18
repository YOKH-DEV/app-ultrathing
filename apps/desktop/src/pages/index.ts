import { type ComponentType } from 'react';
import { CopywriterPanel, VoiceToTextPanel } from '@ultrathing/features';
import { DownloaderPage } from './DownloaderPage';
import { ImagePage } from './ImagePage';
import { FilesPage } from './FilesPage';
import { ScraperPage } from './ScraperPage';
import { LeadsPage } from './LeadsPage';

/**
 * Páginas de módulos ya construidos, indexadas por `route`.
 * Un feature del registro sin entrada aquí cae en `ComingSoon`.
 */
export const pageByRoute: Record<string, ComponentType> = {
  '/downloader': DownloaderPage,
  '/image': ImagePage,
  '/files': FilesPage,
  '/scraper': ScraperPage,
  '/leads': LeadsPage,
  // El copywriter es surface 'both': mismo componente compartido que monta la web.
  '/copywriter': CopywriterPanel,
  '/voz': VoiceToTextPanel,
};
