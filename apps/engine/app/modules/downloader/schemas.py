"""Contratos in/out del módulo de descargas."""
from pydantic import BaseModel, HttpUrl


class StartDownload(BaseModel):
    url: HttpUrl


class DownloadResult(BaseModel):
    title: str
    filepath: str
    ext: str
