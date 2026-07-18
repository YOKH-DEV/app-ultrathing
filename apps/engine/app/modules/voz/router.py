"""Expone el módulo voz. Como el copywriter, NO usa el job system: transcribir es
una petición corta (request/response), sin progreso ni persistencia. El router solo
expone; la lógica vive en service.py.
"""
import os

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from .schemas import TranscriptResult
from .service import transcribe

router = APIRouter(prefix="/modules/voz", tags=["voz"])


@router.post("/transcribe", response_model=TranscriptResult)
async def transcribe_audio(
    file: UploadFile = File(...),
    cleanup: bool = Query(default=True),
    language: str | None = Query(default=None),
) -> dict[str, str]:
    data = await file.read()
    _, ext = os.path.splitext(file.filename or "")
    try:
        return await transcribe(data, suffix=ext or ".webm", cleanup=cleanup, language=language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
