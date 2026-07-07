"""Expone el módulo. El registro lo monta solo si existe la variable `router`."""
import asyncio

from fastapi import APIRouter

from app.core.jobs import create_job, run_job
from .schemas import StartDownload
from .service import download

router = APIRouter(prefix="/modules/downloader", tags=["downloader"])


@router.post("/start")
async def start(body: StartDownload) -> dict[str, str]:
    job = create_job(module="downloader")
    # Se lanza en segundo plano: devolvemos el id al instante, la UI escucha por SSE.
    asyncio.create_task(
        run_job(job, lambda j, report: download(str(body.url), report)),
    )
    return {"job_id": job.id}
