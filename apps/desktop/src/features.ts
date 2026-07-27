import { Download, FileText, Search, PenLine, Users, Mic, ScanText, Palette } from 'lucide-react';
import { registerFeature } from '@ultrathing/core';

// Registro de features. El orden acá define el orden en la navegación.
// Diseño es la sección principal del producto → va primera.
registerFeature({ id: 'diseno', name: 'Diseño', description: 'Crea piezas gráficas en un lienzo.', icon: Palette, surface: 'desktop', route: '/diseno' });

export const downloader = registerFeature({
  id: 'downloader',
  name: 'Descargas',
  description: 'Baja video o audio de cualquier fuente.',
  icon: Download,
  surface: 'desktop',
  route: '/downloader',
});

// El trabajo de imagen (quitar fondo, generar imagen, imagen→editable) vive DENTRO
// de la sección Diseño, no como sección propia — por eso ya no se registra "Imagen".
// Placeholders de futuras fases — se activan al implementar su módulo.
registerFeature({ id: 'files', name: 'Archivos', description: 'Convierte PDF con tablas a CSV.', icon: FileText, surface: 'desktop', route: '/files' });
registerFeature({ id: 'scraper', name: 'Scraper', description: 'Extrae leads desde la web.', icon: Search, surface: 'desktop', route: '/scraper' });
registerFeature({ id: 'leads', name: 'Leads', description: 'Contactos extraídos, en vivo.', icon: Users, surface: 'desktop', route: '/leads' });
registerFeature({ id: 'copywriter', name: 'Copywriter', description: 'Genera copy con IA.', icon: PenLine, surface: 'both', route: '/copywriter' });
registerFeature({ id: 'voz', name: 'Voz a texto', description: 'Graba y convierte tu voz en texto.', icon: Mic, surface: 'both', route: '/voz' });
registerFeature({ id: 'ocr', name: 'Imagen a texto', description: 'Extrae el texto de una imagen o pantallazo.', icon: ScanText, surface: 'both', route: '/ocr' });
