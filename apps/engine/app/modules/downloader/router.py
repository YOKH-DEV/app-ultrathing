"""Expone el módulo. El registro lo monta solo si existe la variable `router`."""
import asyncio

from fastapi import APIRouter, Header

from app.core.jobs import create_job, run_job
from app.core.supabase import user_id_from_token
from .schemas import StartDownload
from .service import download

router = APIRouter(prefix="/modules/downloader", tags=["downloader"])


@router.post("/start")
async def start(
    body: StartDownload, authorization: str | None = Header(default=None)
) -> dict[str, str]:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    user_id: str | None = None
    if token:
        try:
            user_id = user_id_from_token(token)
        except Exception:  # noqa: BLE001 — sin usuario válido no persistimos, pero sí descargamos
            user_id = None

    job = create_job(module="downloader", user_id=user_id, token=token if user_id else None)
    # Se lanza en segundo plano: devolvemos el id al instante, la UI escucha por SSE.
    asyncio.create_task(
        run_job(
            job,
            lambda j, report: download(
                str(body.url), report, user_id, token, body.format, body.quality
            ),
        ),
    )
    return {"job_id": job.id}
