"""Contratos del módulo ocr (imagen → texto)."""
from pydantic import BaseModel


class OcrResult(BaseModel):
    text: str
