"""Configuración central del motor. Todo por variables de entorno."""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    port: int = int(os.getenv("ENGINE_PORT", "8787"))
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    download_dir: str = os.getenv("DOWNLOAD_DIR", os.path.expanduser("~/Ultrathing"))


settings = Settings()
