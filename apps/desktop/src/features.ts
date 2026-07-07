import { Download, Image, Search, PenLine } from 'lucide-react';
import { registerFeature } from '@ultrathing/core';

// Registro de features. El `surface` decide dónde aparece cada uno.
export const downloader = registerFeature({
  id: 'downloader',
  name: 'Descargas',
  description: 'Baja video o audio de cualquier fuente.',
  icon: Download,
  surface: 'desktop',
  route: '/downloader',
});

// Placeholders de futuras fases — se activan al implementar su módulo.
registerFeature({ id: 'image', name: 'Imagen', description: 'Quita fondos y mejora fotos.', icon: Image, surface: 'desktop', route: '/image' });
registerFeature({ id: 'scraper', name: 'Scraper', description: 'Extrae leads desde la web.', icon: Search, surface: 'desktop', route: '/scraper' });
registerFeature({ id: 'copywriter', name: 'Copywriter', description: 'Genera copy con IA.', icon: PenLine, surface: 'both', route: '/copywriter' });
