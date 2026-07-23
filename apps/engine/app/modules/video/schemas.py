"""Contratos del módulo video (diseño → mp4 animado con Remotion)."""
from pydantic import BaseModel

from app.modules.tracer.schemas import TracedElement


class RenderVideo(BaseModel):
    """Mismo contrato de elementos que tracer/design: un solo idioma para todo."""

    elements: list[TracedElement]
    background: str = "#111111"
    width: int = 1080
    height: int = 1350


class VideoResult(BaseModel):
    title: str
    filepath: str
    ext: str
