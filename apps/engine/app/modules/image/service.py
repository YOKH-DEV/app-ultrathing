"""Lógica pura de imagen con rembg (quitar fondo). Sin FastAPI: testeable y reutilizable."""
import asyncio
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rembg import remove

from app.core.config import settings
from app.core.supabase import insert_asset
from .schemas import RemoveBgResult


def _unique_path(directory: Path, stem: str, ext: str) -> Path:
    """Devuelve una ruta libre, agregando -1, -2… si el nombre ya existe."""
    candidate = directory / f"{stem}.{ext}"
    n = 1
    while candidate.exists():
        candidate = directory / f"{stem}-{n}.{ext}"
        n += 1
    return candidate


def _remove_bg(data: bytes, filename: str, on_progress: Callable[[float], None]) -> RemoveBgResult:
    on_progress(10)
    output: bytes = remove(data)  # PNG con canal alpha
    on_progress(90)

    out_dir = Path(settings.download_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{Path(filename).stem or 'imagen'}-sinfondo"
    out_path = _unique_path(out_dir, stem, "png")
    out_path.write_bytes(output)

    on_progress(100)
    return RemoveBgResult(title=out_path.stem, filepath=str(out_path), ext="png")


def _persist(token: str, user_id: str, result: RemoveBgResult) -> None:
    insert_asset(token, user_id, "image", result.title, result.filepath, "image/png")


async def remove_background(
    data: bytes,
    filename: str,
    report: Callable[[float], None],
    user_id: str | None = None,
    token: str | None = None,
) -> dict[str, Any]:
    """Quita el fondo en un hilo (rembg es bloqueante). Persiste el asset si hay usuario."""
    result = await asyncio.to_thread(_remove_bg, data, filename, report)
    if user_id and token:
        await asyncio.to_thread(_persist, token, user_id, result)
    return result.model_dump()
