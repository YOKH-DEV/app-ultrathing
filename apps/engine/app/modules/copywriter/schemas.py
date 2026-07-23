"""Contratos del módulo copywriter."""
from typing import Literal

from pydantic import BaseModel, Field

Tone = Literal["profesional", "cercano", "persuasivo", "divertido"]
Format = Literal["post", "anuncio", "email", "titulares"]
# Acciones rápidas de IA sobre un texto ya existente (quick actions del lienzo).
RewriteAction = Literal["acortar", "alargar", "profesional", "persuasivo", "corregir", "traducir_en"]


class GenerateCopy(BaseModel):
    brief: str = Field(min_length=3)
    tone: Tone = "profesional"
    format: Format = "post"


class RewriteCopy(BaseModel):
    text: str = Field(min_length=1)
    action: RewriteAction


class CopyResult(BaseModel):
    text: str
