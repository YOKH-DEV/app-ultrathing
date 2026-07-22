"""Contratos del módulo de imagen."""
from pydantic import BaseModel


class RemoveBgResult(BaseModel):
    title: str
    filepath: str
    ext: str


class RemoveBgInlineResult(BaseModel):
    image: str  # dataURL "data:image/png;base64,..."
