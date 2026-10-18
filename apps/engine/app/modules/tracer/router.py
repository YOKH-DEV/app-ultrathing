"""Expone el módulo tracer (imagen → editable). Mismo patrón que image/files: job + SSE."""
import asyncio

from fastapi import APIRouter, File, Header, UploadFile

from app.core.jobs import create_job, run_job
from app.core.supabase import user_id_from_token
from .service import decompose

router = APIRouter(prefix="/modules/tracer", tags=["tracer"])


@router.post("/decompose")
async def decompose_image(
    file: UploadFile = File(...), authorization: str | None = Header(default=None)
) -> dict[str, str]:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    user_id: str | None = None
    if token:
        try:
            user_id = user_id_from_token(token)
        except Exception:  # noqa: BLE001 — sin usuario válido no persistimos, pero sí descomponemos
            user_id = None

    data = await file.read()
    filename = file.filename or "imagen"

    job = create_job(module="tracer", user_id=user_id, token=token if user_id else None)
    asyncio.create_task(
        run_job(job, lambda j, report: decompose(data, filename, report, user_id, token)),
    )
    return {"job_id": job.id}
