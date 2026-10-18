"""Punto de entrada del motor. Monta jobs + todos los módulos autodescubiertos."""
import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

from app.core.cors import ALLOWED_ORIGINS, PrivateNetworkCORSMiddleware
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

# La web oficial accede al motor loopback del cliente mediante Private Network Access.
# Cualquier preflight PNA debe superar la misma allowlist exacta; nunca se permite "*".
app.add_middleware(
    PrivateNetworkCORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
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
