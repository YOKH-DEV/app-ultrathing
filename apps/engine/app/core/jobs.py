"""Sistema de jobs: encola trabajo pesado sin bloquear la UI, emite progreso por SSE."""
import asyncio
import json
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import asdict, dataclass, field
from typing import Any

from app.core.supabase import upsert_job


@dataclass
class Job:
    id: str
    module: str
    user_id: str | None = None
    status: str = "queued"       # queued | running | done | error
    progress: float = 0.0
    result: Any | None = None
    error: str | None = None
    _queue: asyncio.Queue = field(default_factory=asyncio.Queue, repr=False)

    def snapshot(self) -> dict[str, Any]:
        d = asdict(self)
        d.pop("_queue")
        d.pop("user_id")  # el contrato del stream no expone el dueño
        return d


# Firma de un handler: recibe el job y una función para reportar progreso.
Handler = Callable[["Job", Callable[[float], None]], Awaitable[Any]]

_jobs: dict[str, Job] = {}


def create_job(module: str, user_id: str | None = None) -> Job:
    job = Job(id=uuid.uuid4().hex[:12], module=module, user_id=user_id)
    _jobs[job.id] = job
    return job


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


async def _mirror(job: Job) -> None:
    """Espeja el estado a Supabase. Nunca tumba el job si Supabase falla."""
    if not job.user_id:
        return
    result = job.result if job.status == "done" else None
    try:
        await asyncio.to_thread(
            upsert_job, job.id, job.user_id, job.module, job.status, job.progress, result, job.error
        )
    except Exception:  # noqa: BLE001 — el espejo es best-effort
        pass


async def run_job(job: Job, handler: Handler) -> None:
    """Ejecuta el handler en segundo plano y empuja actualizaciones al stream."""
    def report(progress: float) -> None:
        job.progress = round(progress, 1)
        job._queue.put_nowait(job.snapshot())

    job.status = "running"
    report(0)
    await _mirror(job)
    try:
        job.result = await handler(job, report)
        job.status = "done"
    except Exception as exc:  # noqa: BLE001 — se reporta al cliente, no se traga
        job.status, job.error = "error", str(exc)
    report(job.progress)
    await _mirror(job)
    job._queue.put_nowait(None)  # centinela de fin


async def stream_job(job: Job) -> AsyncIterator[str]:
    """Formato SSE que consume `streamJob` en el cliente TS."""
    yield f"data: {json.dumps(job.snapshot())}\n\n"
    while True:
        update = await job._queue.get()
        if update is None:
            break
        yield f"data: {json.dumps(update)}\n\n"
