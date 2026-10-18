"""Contratos del módulo voz."""
from pydantic import BaseModel


class TranscriptResult(BaseModel):
    raw: str    # texto tal cual lo transcribe whisper
    clean: str  # texto pulido (ortografía/puntuación) por la IA; == raw si no hubo pulido
