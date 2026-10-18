"""Expone el módulo imagegen. Petición corta (request/response), sin job."""
from fastapi import APIRouter, HTTPException

from .schemas import GenerateImage, ImageResult
from .service import generate

router = APIRouter(prefix="/modules/imagegen", tags=["imagegen"])


@router.post("/generate", response_model=ImageResult)
async def generate_image(body: GenerateImage) -> dict[str, str]:
    try:
        return await generate(body.prompt)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
