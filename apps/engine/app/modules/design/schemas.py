"""Contratos del módulo design (brief → pieza editable generada por IA)."""
from pydantic import BaseModel, Field


class GenerateDesign(BaseModel):
    brief: str = Field(min_length=3)
    width: int = 1080
    height: int = 1080
