"""Expone el módulo ocr. Petición corta (request/response), sin job ni persistencia.
El router solo expone; la lógica vive en service.py.
"""
from fastapi import APIRouter, File, HTTPException, UploadFile

from .schemas import OcrResult
from .service import extract

router = APIRouter(prefix="/modules/ocr", tags=["ocr"])


@router.post("/extract", response_model=OcrResult)
async def extract_text(file: UploadFile = File(...)) -> dict[str, str]:
    data = await file.read()
    try:
        return {"text": await extract(data)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
