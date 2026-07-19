"""Contratos in/out del módulo de descargas."""
from typing import Literal

from pydantic import BaseModel, HttpUrl

# mp4 = video, mp3 = solo audio. Calidad = tope de resolución para mp4 ("mejor" = la más alta).
Format = Literal["mp4", "mp3"]
Quality = Literal["mejor", "2160", "1440", "1080", "720"]


class StartDownload(BaseModel):
    url: HttpUrl
    format: Format = "mp4"
    quality: Quality = "mejor"


class DownloadResult(BaseModel):
    title: str
    filepath: str
    ext: str
    platform: str = ""          # de dónde se bajó (YouTube, TikTok, Instagram…)
    duration: int | None = None  # segundos, si el sitio lo reporta


class HistoryItem(BaseModel):
    title: str
    platform: str = ""
    format: Format = "mp4"
    ext: str = ""
    duration: int | None = None
    at: str = ""  # ISO timestamp
