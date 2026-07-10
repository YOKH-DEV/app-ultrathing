"""Contratos del módulo de imagen."""
from pydantic import BaseModel


class RemoveBgResult(BaseModel):
    title: str
    filepath: str
    ext: str
