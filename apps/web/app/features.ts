import { Download, FileText, Search, PenLine, Users, Mic, ScanText, Palette } from 'lucide-react';
import { registerFeature } from '@ultrathing/core';

/** Registro web. El orden define la nav del panel. */
registerFeature({
  id: 'diseno',
  name: 'Diseño',
  description: 'Crea piezas gráficas en un lienzo.',
  icon: Palette,
  surface: 'web',
  route: '/app/diseno',
});
registerFeature({
  id: 'downloader',
  name: 'Descargas',
  description: 'Baja video o audio de cualquier fuente.',
  icon: Download,
  surface: 'web',
  route: '/app/descargas',
});
registerFeature({
  id: 'files',
  name: 'Archivos',
  description: 'Convierte PDF con tablas a CSV.',
  icon: FileText,
  surface: 'web',
  route: '/app/archivos',
});
registerFeature({
  id: 'scraper',
  name: 'Scraper',
  description: 'Extrae leads desde la web.',
  icon: Search,
  surface: 'web',
  route: '/app/scraper',
});
registerFeature({
  id: 'leads',
  name: 'Leads',
  description: 'Contactos extraídos, en vivo.',
  icon: Users,
  surface: 'web',
  route: '/app/leads',
});
registerFeature({
  id: 'copywriter',
  name: 'Copywriter',
  description: 'Genera copy con IA.',
  icon: PenLine,
  surface: 'web',
  route: '/app/copywriter',
});
registerFeature({
  id: 'voz',
  name: 'Voz a texto',
  description: 'Graba y convierte tu voz en texto.',
  icon: Mic,
  surface: 'web',
  route: '/app/voz',
});
registerFeature({
  id: 'ocr',
  name: 'Imagen a texto',
  description: 'Extrae el texto de una imagen o pantallazo.',
  icon: ScanText,
  surface: 'web',
  route: '/app/ocr',
});
