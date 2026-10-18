/**
 * Carga bajo demanda de Google Fonts detectadas por la IA del tracer.
 *
 * Cuando "imagen → editable" identifica la tipografía de cada texto (p. ej. "Montserrat"),
 * inyectamos su hoja de estilo de Google Fonts una sola vez, para que al EDITAR ese texto
 * se re-dibuje con la familia más parecida a la original. La CSP de la app está abierta
 * (`csp: null`), así que el `<link>` a fonts.googleapis.com carga sin bloqueos.
 */
const requested = new Set<string>();

/** Familias genéricas que no son Google Fonts: no se cargan por red. */
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'system-ui', 'inherit', '']);

/**
 * Asegura que la familia esté disponible para renderizar. Idempotente: una familia
 * se pide una sola vez. Ignora las genéricas. Cuenta con document (entorno navegador).
 */
export function ensureFont(family: string | null | undefined): void {
  if (typeof document === 'undefined') return;
  const name = (family ?? '').trim();
  if (GENERIC.has(name) || requested.has(name)) return;
  requested.add(name);

  const id = 'gf-' + name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  // Traemos pesos 400 y 700 (regular y negrita), que cubren casi todo el diseño gráfico.
  link.href =
    'https://fonts.googleapis.com/css2?family=' +
    encodeURIComponent(name).replace(/%20/g, '+') +
    ':ital,wght@0,400;0,700;1,400;1,700&display=swap';
  document.head.appendChild(link);
}
