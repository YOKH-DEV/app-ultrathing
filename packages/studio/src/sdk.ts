/**
 * Facade del motor de canvas. ÚNICO punto del studio que importa `tldraw` directo.
 *
 * Regla de oro: los plugins, paneles y la app SIEMPRE importan desde
 * `@ultrathing/studio/sdk`, nunca desde `tldraw`. Así el runtime queda desacoplado
 * y reemplazable (konva/motor propio) sin reescribir plugins ni documentos — lo que
 * nos protege de la licencia comercial de tldraw en el go-live.
 */
export * from 'tldraw';
