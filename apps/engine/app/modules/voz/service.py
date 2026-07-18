"""Lógica pura del módulo voz: audio → texto (whisper) → pulido de ortografía (IA).

Corre en la máquina del usuario (transcripción 100% local con faster-whisper).
No persiste nada: el audio va a un temporal que se borra al terminar; el texto es
efímero (se muestra y se copia). El pulido con IA es best-effort: si el proveedor
no responde (sin saldo/key), se devuelve el texto crudo.
"""
import asyncio
import os
import tempfile
from functools import lru_cache

from faster_whisper import WhisperModel

from app.core.ai import chat
from app.core.config import settings
from .schemas import TranscriptResult


@lru_cache(maxsize=1)
def _model() -> WhisperModel:
    """Carga el modelo una sola vez y lo reusa entre peticiones."""
    return WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")


def _transcribe_file(path: str) -> str:
    segments, _info = _model().transcribe(path, vad_filter=True)
    return " ".join(seg.text.strip() for seg in segments).strip()


def _cleanup_prompt(raw: str) -> list[dict[str, str]]:
    system = (
        "Corriges transcripciones de voz en español. Arreglas ortografía, acentos, "
        "puntuación y mayúsculas, y organizas el texto en frases/párrafos legibles. "
        "No cambias el sentido ni agregas contenido. Devuelves solo el texto corregido."
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": raw}]


async def transcribe(audio: bytes, suffix: str = ".webm", cleanup: bool = True) -> dict[str, str]:
    """Transcribe el audio y devuelve {raw, clean}. Lanza ValueError si el audio
    está vacío o whisper no logra sacar texto.

    `cleanup=False` salta el pulido con IA (para los trozos de dictado en vivo, donde
    importa la latencia): en ese caso `clean == raw`.
    """
    if not audio:
        raise ValueError("No se recibió audio.")

    fd, path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(audio)
        raw = await asyncio.to_thread(_transcribe_file, path)
    finally:
        try:
            os.remove(path)
        except OSError:
            pass

    if not raw:
        raise ValueError("No se detectó voz en el audio.")

    # Pulido best-effort: si la IA no responde (sin saldo/key), nos quedamos con el crudo.
    clean = raw
    if cleanup:
        try:
            clean = await chat(_cleanup_prompt(raw), temperature=0.2)
        except Exception:  # noqa: BLE001 — el pulido es opcional, no debe tumbar la transcripción
            clean = raw

    return TranscriptResult(raw=raw, clean=clean).model_dump()
