"""Contratos del módulo imagegen (texto → imagen con IA)."""
from pydantic import BaseModel, Field


class GenerateImage(BaseModel):
    prompt: str = Field(min_length=3)


class ImageResult(BaseModel):
    image: str  # dataURL "data:image/png;base64,..."
