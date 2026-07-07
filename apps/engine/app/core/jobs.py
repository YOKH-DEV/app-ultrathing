"""Sistema de jobs: encola trabajo pesado sin bloquear la UI, emite progreso por SSE."""
import asyncio
import json
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class Job:
    id: str
    module: str
    status: str = "queued"       # queued | running | done | error
    progress: float = 0.0
    result: Any | None = None
    error: str | None = None
    _queue: asyncio.Queue = field(default_factory=asyncio.Queue, repr=False)

    def snapshot(self) -> dict[str, Any]:
        d = asdict(self)
        d.pop("_queue")
        return d


# Firma de un handler: recibe el job y una función para reportar progreso.
Handler = Callable[["Job", Callable[[float], None]], Awaitable[Any]]

_jobs: dict[str, Job] = {}


def create_job(module: str) -> Job:
    job = Job(id=uuid.uuid4().hex[:12], module=module)
    _jobs[job.id] = job
    return job


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


async def run_job(job: Job, handler: Handler) -> None:
    """Ejecuta el handler en segundo plano y empuja actualizaciones al stream."""
    def report(progress: float) -> None:
        job.progress = round(progress, 1)
        job._queue.put_nowait(job.snapshot())

    job.status = "running"
    report(0)
    try:
        job.result = await handler(job, report)
        job.status = "done"
    except Exception as exc:  # noqa: BLE001 — se reporta al cliente, no se traga
        job.status, job.error = "error", str(exc)
    report(job.progress)
    job._queue.put_nowait(None)  # centinela de fin


async def stream_job(job: Job) -> AsyncIterator[str]:
    """Formato SSE que consume `streamJob` en el cliente TS."""
    yield f"data: {json.dumps(job.snapshot())}\n\n"
    while True:
        update = await job._queue.get()
        if update is None:
            break
        yield f"data: {json.dumps(update)}\n\n"
