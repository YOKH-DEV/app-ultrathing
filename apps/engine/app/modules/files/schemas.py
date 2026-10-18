"""Contratos del módulo de archivos."""
from pydantic import BaseModel


class PdfToCsvResult(BaseModel):
    title: str
    filepath: str
    ext: str
    rows: int
    tables: int
