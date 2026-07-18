"""Expone el módulo copywriter. A diferencia de los demás, NO usa el job system:
generar copy es una petición corta (request/response), sin progreso ni persistencia.
El router solo expone; toda la lógica vive en service.py.
"""
from fastapi import APIRouter, HTTPException

from .schemas import CopyResult, GenerateCopy
from .service import generate

router = APIRouter(prefix="/modules/copywriter", tags=["copywriter"])


@router.post("/generate", response_model=CopyResult)
async def generate_copy(body: GenerateCopy) -> dict[str, str]:
    try:
        return await generate(body.brief, body.tone, body.format)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
