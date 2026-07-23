import { useCallback, useRef, type ReactNode } from 'react';
import { Tldraw, type Editor, type TLComponents, type TLEditorSnapshot } from './sdk';
import {
  collectShapeUtils,
  collectTools,
  composeUiOverrides,
  type StudioPlugin,
} from './plugins';

export interface StudioProps {
  /** Documento a cargar (snapshot de tldraw). Si falta, arranca en lienzo vacío. */
  snapshot?: TLEditorSnapshot | null;
  /** Autosave debounced: recibe el snapshot completo del documento. */
  onSave?: (snapshot: TLEditorSnapshot) => void | Promise<void>;
  /** Debounce del autosave en ms (default 1500). */
  autosaveMs?: number;
  /** Plugins que aportan shapes/tools/UI propios (extensión por tipo de contenido). */
  plugins?: StudioPlugin[];
  /** Override de componentes de la UI de tldraw (topbar/panels propios). */
  components?: TLComponents;
  /** Se llama con el editor ya montado: úsalo para topbar externo (export, undo…). */
  onReady?: (editor: Editor) => void;
  /** Overlay sobre el canvas (panel IA, drawers de assets/plantillas). */
  children?: ReactNode;
}

/**
 * Lienzo del studio. Envuelve el motor (hoy tldraw, vía el facade `./sdk`) y le suma
 * tema oscuro, carga/guardado por snapshot y el sistema de plugins. La app dueña
 * aporta su propio cromo (topbar) usando `onReady` y monta paneles vía `children`.
 */
export function Studio({
  snapshot,
  onSave,
  autosaveMs = 1500,
  plugins = [],
  components,
  onReady,
  children,
}: StudioProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shapeUtils = collectShapeUtils(plugins);
  const tools = collectTools(plugins);
  const overrides = composeUiOverrides(plugins);

  const handleMount = useCallback(
    (editor: Editor) => {
      // Tema oscuro coherente con UltraThing.
      editor.user.updateUserPreferences({ colorScheme: 'dark' });

      // Cargar el documento si viene uno; snapshot inválido → lienzo vacío, sin romper.
      if (snapshot) {
        try {
          editor.loadSnapshot(snapshot);
        } catch {
          /* documento incompatible (ej. formato konva viejo): se ignora */
        }
      }

      // Autosave debounced: solo cambios del usuario sobre el documento.
      let unlisten = () => {};
      if (onSave) {
        unlisten = editor.store.listen(
          () => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              void onSave(editor.getSnapshot());
            }, autosaveMs);
          },
          { source: 'user', scope: 'document' },
        );
      }

      onReady?.(editor);

      // Cleanup al desmontar el editor.
      return () => {
        if (timer.current) clearTimeout(timer.current);
        unlisten();
      };
    },
    [snapshot, onSave, autosaveMs, onReady],
  );

  return (
    <div className="ut-studio">
      <Tldraw
        onMount={handleMount}
        shapeUtils={shapeUtils}
        tools={tools}
        overrides={overrides}
        components={components}
      />
      {children}
    </div>
  );
}
