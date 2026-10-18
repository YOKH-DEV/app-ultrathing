"""Expone el módulo scraper. Patrón JSON del downloader: job + SSE + persistencia."""
import asyncio

from fastapi import APIRouter, Header

from app.core.jobs import create_job, run_job
from app.core.supabase import user_id_from_token
from .schemas import StartScrape
from .service import scrape

router = APIRouter(prefix="/modules/scraper", tags=["scraper"])


@router.post("/start")
async def start(
    body: StartScrape, authorization: str | None = Header(default=None)
) -> dict[str, str]:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    user_id: str | None = None
    if token:
        try:
            user_id = user_id_from_token(token)
        except Exception:  # noqa: BLE001 — sin usuario válido no persistimos, pero sí extraemos
            user_id = None

    job = create_job(module="scraper", user_id=user_id, token=token if user_id else None)
    asyncio.create_task(
        run_job(job, lambda j, report: scrape(str(body.url), report, user_id, token)),
    )
    return {"job_id": job.id}
