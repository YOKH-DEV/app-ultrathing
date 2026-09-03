"""Punto de entrada del motor. Monta jobs + todos los módulos autodescubiertos."""
import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.core.jobs import get_job, stream_job
from app.core.registry import discover_routers


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Precarga el modelo de voz en segundo plano al arrancar, para que la primera
    # transcripción no tenga que esperar la carga/descarga del modelo.
    async def _warm() -> None:
        try:
            from app.modules.voz.service import warmup

            await asyncio.to_thread(warmup)
        except Exception:  # noqa: BLE001 — la precarga es best-effort, no debe tumbar el arranque
            pass

    task = asyncio.create_task(_warm())
    yield
    task.cancel()


app = FastAPI(title="Ultrathing Engine", lifespan=lifespan)

# La UI (web/escritorio) corre en localhost; solo se permiten esos orígenes.
# web :3000 (sesión de llegada) · :3100 legado · escritorio Vite :1420 · tauri://localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3100",
        "http://127.0.0.1:3100",
        "http://localhost:1420",
        "tauri://localhost",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/jobs/{job_id}/stream")
async def job_stream(job_id: str) -> StreamingResponse:
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "job no encontrado")
    return StreamingResponse(stream_job(job), media_type="text/event-stream")


for router in discover_routers():
    app.include_router(router)
