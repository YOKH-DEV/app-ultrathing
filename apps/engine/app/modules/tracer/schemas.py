"""Contratos del módulo tracer (imagen → objetos editables).

El formato de elemento es AGNÓSTICO al motor de canvas: describe qué hay y dónde
(en píxeles de la imagen original). El cliente (studio) lo traduce a shapes de tldraw.
Este mismo contrato lo puede emitir el OCR, generarlo la IA o animarlo Remotion.
"""
from typing import Literal

from pydantic import BaseModel

ElementKind = Literal["text", "rect", "ellipse", "image"]


class TracedElement(BaseModel):
    """Un objeto editable extraído de la imagen. Coordenadas en px de la imagen fuente."""

    kind: ElementKind
    x: float
    y: float
    w: float
    h: float
    # Texto
    text: str | None = None
    font_size: float | None = None
    color: str | None = None  # hex "#rrggbb"
    # Forma
    fill: str | None = None  # hex o "none"
    # Imagen (fondo = imagen ORIGINAL intacta, o parche local)
    src: str | None = None  # dataURL "data:image/png;base64,..."
    # --- Enfoque no destructivo (overlay) ---
    # Un texto del tracer es un OVERLAY: no se pinta hasta que el usuario lo edita,
    # así el diseño se ve idéntico al original (con su tipografía real). Al editar,
    # se tapa la zona con `patch` (recorte del fondo local ya sin el texto) y se
    # muestra el texto nuevo con `font_family`/`font_weight` aproximados.
    overlay: bool = False  # True → invisible hasta editar (solo textos del tracer)
    bg_color: str | None = None  # color de fondo local (parche plano de respaldo)
    patch: str | None = None  # dataURL del recorte de fondo local con el texto borrado
    font_family: str | None = None  # hint de familia ("serif"/"sans-serif") si se detecta
    font_weight: int | None = None  # peso aproximado (400/700) por densidad de trazo


class TraceResult(BaseModel):
    """Resultado de descomponer una imagen en objetos editables."""

    width: int  # dimensiones de la imagen fuente (para escalar en el lienzo)
    height: int
    background: str | None = None  # color de fondo plano (hex) si la imagen es lisa
    palette: list[str] = []  # colores dominantes (hex) para recolorear la pieza
    elements: list[TracedElement] = []
    count: int = 0
