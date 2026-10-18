"""Expone el módulo design. Petición corta (request/response), sin job: la IA devuelve
el layout de la pieza y el cliente lo monta en el lienzo. Reusa el schema del tracer."""
from fastapi import APIRouter, HTTPException

from app.modules.tracer.schemas import TraceResult
from .schemas import GenerateDesign
from .service import generate_design

router = APIRouter(prefix="/modules/design", tags=["design"])


@router.post("/generate", response_model=TraceResult)
async def generate(body: GenerateDesign) -> dict[str, object]:
    try:
        return await generate_design(body.brief, body.width, body.height)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
