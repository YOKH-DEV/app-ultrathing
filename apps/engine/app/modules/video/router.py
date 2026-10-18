"""Expone el módulo video. Render pesado → job + SSE, como downloader/files."""
import asyncio

from fastapi import APIRouter, Header

from app.core.jobs import create_job, run_job
from app.core.supabase import user_id_from_token
from .schemas import RenderVideo
from .service import render

router = APIRouter(prefix="/modules/video", tags=["video"])


@router.post("/render")
async def render_video(
    body: RenderVideo, authorization: str | None = Header(default=None)
) -> dict[str, str]:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    user_id: str | None = None
    if token:
        try:
            user_id = user_id_from_token(token)
        except Exception:  # noqa: BLE001 — sin usuario válido igual renderizamos
            user_id = None

    elements = [e.model_dump() for e in body.elements]
    job = create_job(module="video", user_id=user_id, token=token if user_id else None)
    asyncio.create_task(
        run_job(
            job,
            lambda j, report: render(
                elements, body.background, body.width, body.height, report, user_id, token
            ),
        ),
    )
    return {"job_id": job.id}
