"""Configuración central del motor. Todo por variables de entorno."""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# El .env.local vive en la raíz del monorepo (mismas claves que web/escritorio).
_ROOT = Path(__file__).resolve().parents[4]
load_dotenv(_ROOT / ".env.local")


@dataclass(frozen=True)
class Settings:
    port: int = int(os.getenv("ENGINE_PORT", "8787"))
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    download_dir: str = os.getenv("DOWNLOAD_DIR", os.path.expanduser("~/Ultrathing"))


settings = Settings()
