import { forwardRef, useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import type { DesignElement, ImageElementProps } from '@ultrathing/core';

interface NodeProps {
  el: DesignElement;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<DesignElement>) => void;
}

/** Baja la escala del Transformer a width/height reales y reporta el cambio.
 * Común a imagen y forma (el texto usa su propia lógica de solo-ancho). */
function bakeTransform(node: Konva.Node, el: DesignElement, onChange: NodeProps['onChange']) {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  node.scaleX(1);
  node.scaleY(1);
  onChange(el.id, {
    x: node.x(),
    y: node.y(),
    width: Math.max(5, (el.width || node.width()) * scaleX),
    height: Math.max(5, (el.height || node.height()) * scaleY),
    rotation: node.rotation(),
  });
}

/** Nodo de imagen: carga el dataURL en un HTMLImageElement y lo pinta en el lienzo. */
export const ImageNode = forwardRef<Konva.Image, NodeProps>(function ImageNode(
  { el, onSelect, onChange },
  ref,
) {
  const { src } = el.props as unknown as ImageElementProps;
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
  return (
    <KonvaImage
      ref={ref}
      image={img}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={el.opacity}
      draggable
      onClick={() => onSelect(el.id)}
      onTap={() => onSelect(el.id)}
      onDragEnd={(e) => onChange(el.id, { x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => bakeTransform(e.target, el, onChange)}
    />
  );
});

export { bakeTransform };
