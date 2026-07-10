"""Punto de entrada del motor. Monta jobs + todos los módulos autodescubiertos."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.core.jobs import get_job, stream_job
from app.core.registry import discover_routers

app = FastAPI(title="Ultrathing Engine")

# La UI (web/escritorio) corre en localhost; solo se permiten esos orígenes.
# web dev :3100 · escritorio Vite :1420 · escritorio empaquetado tauri://localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3100",
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
