"""Lógica pura de descarga con yt-dlp. Sin FastAPI: fácil de testear y reutilizar."""
import asyncio
from collections.abc import Callable
from typing import Any

from yt_dlp import YoutubeDL

from app.core.config import settings
from .schemas import DownloadResult


def _download(url: str, on_progress: Callable[[float], None]) -> DownloadResult:
    def hook(d: dict[str, Any]) -> None:
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            if total:
                on_progress(d["downloaded_bytes"] / total * 100)

    opts = {
        "outtmpl": f"{settings.download_dir}/%(title)s.%(ext)s",
        "progress_hooks": [hook],
        "noplaylist": True,
    }
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return DownloadResult(
            title=info["title"],
            filepath=ydl.prepare_filename(info),
            ext=info["ext"],
        )


async def download(url: str, report: Callable[[float], None]) -> dict[str, Any]:
    """Corre la descarga bloqueante en un hilo para no frenar el loop async."""
    result = await asyncio.to_thread(_download, url, report)
    return result.model_dump()
