"""Contratos del módulo copywriter."""
from typing import Literal

from pydantic import BaseModel, Field

Tone = Literal["profesional", "cercano", "persuasivo", "divertido"]
Format = Literal["post", "anuncio", "email", "titulares"]


class GenerateCopy(BaseModel):
    brief: str = Field(min_length=3)
    tone: Tone = "profesional"
    format: Format = "post"


class CopyResult(BaseModel):
    text: str
