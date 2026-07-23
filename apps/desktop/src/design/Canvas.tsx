import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Text, Transformer, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import type {
  DesignElement,
  DesignBackground,
  TextElementProps,
  ShapeElementProps,
} from '@ultrathing/core';
import { ImageNode, bakeTransform } from './nodes';

interface CanvasProps {
  width: number;
  height: number;
  background: DesignBackground | null;
  elements: DesignElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<DesignElement>) => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
}

/** Imagen de fondo del lienzo: cubre todo el área (x0,y0,width,height), no seleccionable. */
function BackgroundImage({ src, width, height }: { src: string; width: number; height: number }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new window.Image();
    image.src = src;
    image.onload = () => setImg(image);
    return () => {
      image.onload = null;
    };
  }, [src]);
  if (!img) return null;
  return <KonvaImage image={img} x={0} y={0} width={width} height={height} listening={false} />;
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
  stageRef,
}: CanvasProps) {
  const scale = Math.min(MAX_W / width, MAX_H / height, 1);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node | null>>({});

  // Ata el Transformer al nodo seleccionado cada vez que cambia la selección o la lista.
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedId ? nodeRefs.current[selectedId] : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements]);

  const bgFill = background?.type === 'color' ? background.value : '#ffffff';
  const selectedType = elements.find((e) => e.id === selectedId)?.type ?? null;
  // El texto solo escala en ancho; imagen y forma escalan en 2D (corners).
  const anchors =
    selectedType === 'text'
      ? (['middle-left', 'middle-right'] as const)
      : (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const);

  const sorted = elements.slice().sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Stage
      ref={stageRef}
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

        {background?.type === 'image' && background.value && (
          <BackgroundImage src={background.value} width={width} height={height} />
        )}

        {sorted.map((el) => {
          const attach = (n: Konva.Node | null) => {
            nodeRefs.current[el.id] = n;
          };

          if (el.type === 'image') {
            return (
              <ImageNode key={el.id} ref={attach} el={el} onSelect={onSelect} onChange={onChange} />
            );
          }

          if (el.type === 'shape') {
            const p = el.props as unknown as ShapeElementProps;
            const common = {
              ref: attach,
              rotation: el.rotation,
              opacity: el.opacity,
              draggable: true,
              onClick: () => onSelect(el.id),
              onTap: () => onSelect(el.id),
              onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
                onChange(el.id, { x: e.target.x(), y: e.target.y() }),
              onTransformEnd: (e: Konva.KonvaEventObject<Event>) =>
                bakeTransform(e.target, el, onChange),
            };
            if (p.variant === 'circle') {
              // Ellipse se posiciona por su centro; se mapea el bounding-box (x,y,w,h).
              return (
                <Ellipse
                  key={el.id}
                  {...common}
                  x={el.x + el.width / 2}
                  y={el.y + el.height / 2}
                  radiusX={el.width / 2}
                  radiusY={el.height / 2}
                  fill={p.fill}
                  stroke={p.stroke}
                  strokeWidth={p.strokeWidth}
                  onDragEnd={(e) =>
                    onChange(el.id, {
                      x: e.target.x() - el.width / 2,
                      y: e.target.y() - el.height / 2,
                    })
                  }
                />
              );
            }
            if (p.variant === 'line') {
              return (
                <Line
                  key={el.id}
                  {...common}
                  x={el.x}
                  y={el.y}
                  points={[0, 0, el.width, 0]}
                  stroke={p.stroke}
                  strokeWidth={p.strokeWidth}
                />
              );
            }
            return (
              <Rect
                key={el.id}
                {...common}
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                fill={p.fill}
                stroke={p.stroke}
                strokeWidth={p.strokeWidth}
              />
            );
          }

          // Texto (Fase 2)
          const props = el.props as unknown as TextElementProps;
          return (
            <Text
              key={el.id}
              ref={attach}
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
          enabledAnchors={anchors as unknown as string[]}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 ? oldBox : newBox)}
        />
      </Layer>
    </Stage>
  );
}
