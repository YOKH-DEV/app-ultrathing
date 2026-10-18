"""Expone el módulo de archivos. Mismo patrón que downloader/image: job + SSE + persistencia."""
import asyncio

from fastapi import APIRouter, File, Header, UploadFile

from app.core.jobs import create_job, run_job
from app.core.supabase import user_id_from_token
from .service import pdf_to_csv

router = APIRouter(prefix="/modules/files", tags=["files"])


@router.post("/pdf-to-csv")
async def convert(
    file: UploadFile = File(...), authorization: str | None = Header(default=None)
) -> dict[str, str]:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    user_id: str | None = None
    if token:
        try:
            user_id = user_id_from_token(token)
        except Exception:  # noqa: BLE001 — sin usuario válido no persistimos, pero sí convertimos
            user_id = None

    data = await file.read()
    filename = file.filename or "documento.pdf"

    job = create_job(module="files", user_id=user_id, token=token if user_id else None)
    asyncio.create_task(
        run_job(job, lambda j, report: pdf_to_csv(data, filename, report, user_id, token)),
    )
    return {"job_id": job.id}
