"""Lógica pura de descarga con yt-dlp. Sin FastAPI: fácil de testear y reutilizar."""
import asyncio
import os
from collections.abc import Callable
from functools import lru_cache
from typing import Any

import imageio_ffmpeg
from yt_dlp import YoutubeDL

from app.core.config import settings
from app.core.supabase import insert_download
from . import history
from .schemas import DownloadResult, Format, Quality


@lru_cache(maxsize=1)
def _ffmpeg_dir() -> str:
    """Carpeta con un `ffmpeg` que yt-dlp pueda encontrar. yt-dlp lo necesita para
    extraer audio (mp3) y unir video+audio en alta resolución (1080p+/4K).

    imageio-ffmpeg entrega el binario con nombre versionado (ffmpeg-linux-...-v7.0.2),
    que yt-dlp no reconoce: creamos un symlink llamado `ffmpeg` en una carpeta propia
    y devolvemos esa carpeta como `ffmpeg_location`.
    """
    exe = str(imageio_ffmpeg.get_ffmpeg_exe())
    bin_dir = os.path.join(os.path.dirname(exe), "_ytdlp_bin")
    os.makedirs(bin_dir, exist_ok=True)
    link = os.path.join(bin_dir, "ffmpeg")
    if not os.path.exists(link):
        os.symlink(exe, link)
    return bin_dir


def _build_opts(format: Format, quality: Quality) -> dict[str, Any]:
    opts: dict[str, Any] = {
        "outtmpl": f"{settings.download_dir}/%(title)s.%(ext)s",
        "noplaylist": True,
        "ffmpeg_location": _ffmpeg_dir(),
    }
    if format == "mp3":
        opts["format"] = "bestaudio/best"
        opts["postprocessors"] = [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}
        ]
    else:  # mp4
        if quality == "mejor":
            opts["format"] = "bestvideo+bestaudio/best"
        else:
            h = int(quality)
            opts["format"] = f"bestvideo[height<=?{h}]+bestaudio/best[height<=?{h}]"
        opts["merge_output_format"] = "mp4"
    return opts


def _download(
    url: str, format: Format, quality: Quality, on_progress: Callable[[float], None]
) -> DownloadResult:
    def hook(d: dict[str, Any]) -> None:
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            if total:
                on_progress(d["downloaded_bytes"] / total * 100)

    opts = _build_opts(format, quality)
    opts["progress_hooks"] = [hook]
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        # requested_downloads trae la ruta/ext FINAL (tras convertir a mp3 o unir a mp4);
        # prepare_filename daría el ext previo al postprocesado.
        done = (info.get("requested_downloads") or [{}])[0]
        duration = info.get("duration")
        result = DownloadResult(
            title=info["title"],
            filepath=done.get("filepath") or ydl.prepare_filename(info),
            ext=done.get("ext") or info["ext"],
            platform=info.get("extractor_key") or "",
            duration=int(duration) if duration else None,
        )
    history.add(
        {
            "title": result.title,
            "platform": result.platform,
            "format": format,
            "ext": result.ext,
            "duration": result.duration,
        }
    )
    return result


def _persist(token: str, user_id: str, result: DownloadResult) -> None:
    insert_download(token, user_id, result.title, result.filepath, result.ext)


async def download(
    url: str,
    report: Callable[[float], None],
    user_id: str | None = None,
    token: str | None = None,
    format: Format = "mp4",
    quality: Quality = "mejor",
) -> dict[str, Any]:
    """Corre la descarga bloqueante en un hilo para no frenar el loop async.

    Si hay usuario, persiste la fila en `downloads` a su nombre (autenticado con su token).
    """
    result = await asyncio.to_thread(_download, url, format, quality, report)
    if user_id and token:
        await asyncio.to_thread(_persist, token, user_id, result)
    return result.model_dump()
