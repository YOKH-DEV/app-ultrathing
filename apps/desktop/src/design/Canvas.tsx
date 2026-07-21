import { useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { DesignElement, DesignBackground, TextElementProps } from '@ultrathing/core';

interface CanvasProps {
  width: number;
  height: number;
  background: DesignBackground | null;
  elements: DesignElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<DesignElement>) => void;
}

/** Área máxima donde cabe el lienzo; se escala para entrar sin deformar. */
const MAX_W = 720;
const MAX_H = 560;

/**
 * Lienzo del editor (Konva Stage). Los elementos guardan coordenadas en el espacio
 * real del diseño (p. ej. 1080×1080); el Stage se escala para caber en pantalla.
 * Selección con clic → Transformer (mover/escalar-ancho/rotar); clic en vacío deselecciona.
 */
export function Canvas({
  width,
  height,
  background,
  elements,
  selectedId,
  onSelect,
  onChange,
}: CanvasProps) {
  const scale = Math.min(MAX_W / width, MAX_H / height, 1);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Text | null>>({});

  // Ata el Transformer al nodo seleccionado cada vez que cambia la selección o la lista.
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedId ? nodeRefs.current[selectedId] : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements]);

  const bgFill = background?.type === 'color' ? background.value : '#ffffff';

  return (
    <Stage
      width={width * scale}
      height={height * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(e) => {
        // Clic en zona vacía (el propio Stage) → deseleccionar.
        if (e.target === e.target.getStage()) onSelect(null);
      }}
      className="bg-white shadow-glow"
    >
      <Layer>
        <Rect x={0} y={0} width={width} height={height} fill={bgFill} listening={false} />

        {elements
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((el) => {
            if (el.type !== 'text') return null; // imágenes/formas: Fase 3
            const props = el.props as unknown as TextElementProps;
            return (
              <Text
                key={el.id}
                ref={(n) => {
                  nodeRefs.current[el.id] = n;
                }}
                x={el.x}
                y={el.y}
                width={el.width || undefined}
                rotation={el.rotation}
                opacity={el.opacity}
                text={props.text}
                fontSize={props.fontSize}
                fontFamily={props.fontFamily}
                fill={props.fill}
                fontStyle={props.fontStyle}
                align={props.align}
                draggable
                onClick={() => onSelect(el.id)}
                onTap={() => onSelect(el.id)}
                onDragEnd={(e) => onChange(el.id, { x: e.target.x(), y: e.target.y() })}
                onTransformEnd={(e) => {
                  const node = e.target as Konva.Text;
                  const scaleX = node.scaleX();
                  const newWidth = Math.max(20, node.width() * scaleX);
                  node.scaleX(1);
                  node.scaleY(1);
                  onChange(el.id, {
                    x: node.x(),
                    y: node.y(),
                    width: newWidth,
                    rotation: node.rotation(),
                  });
                }}
              />
            );
          })}

        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={['middle-left', 'middle-right']}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 ? oldBox : newBox)}
        />
      </Layer>
    </Stage>
  );
}
