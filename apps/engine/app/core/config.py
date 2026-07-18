"""Configuración central del motor. Todo por variables de entorno."""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# El .env.local vive en la raíz del monorepo (mismas claves que web/escritorio). En el
# binario empaquetado (PyInstaller) __file__ apunta a una carpeta temporal, así que esto
# no encuentra nada — es un no-op seguro, y por eso los defaults de abajo cubren ese caso.
_ROOT = Path(__file__).resolve().parents[4]
load_dotenv(_ROOT / ".env.local")


@dataclass(frozen=True)
class Settings:
    port: int = int(os.getenv("ENGINE_PORT", "8787"))
    # URL y anon key son públicas por diseño (mismas que ya viajan en el bundle de
    # web/escritorio) — está bien tenerlas como default fijo para que el motor
    # empaquetado funcione sin depender de un .env.local que no existe en la
    # máquina del cliente. El motor NUNCA usa la service_role key (ver supabase.py).
    supabase_url: str = os.getenv("SUPABASE_URL", "https://vgtwylbmefujgvhsgrre.supabase.co")
    supabase_anon_key: str = os.getenv(
        "SUPABASE_ANON_KEY",
        os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_NYILSb0ci4kxI6J1Y3e-Xw_pErjjeOO"),
    )
    download_dir: str = os.getenv("DOWNLOAD_DIR", os.path.expanduser("~/Ultrathing"))
    # Proveedor de IA del módulo copywriter (z.ai / GLM, API compatible con OpenAI).
    # La key es privada: SOLO va en .env.local, nunca hardcodeada ni al repo. El
    # binario empaquetado no la lleva; el copywriter solo funciona con .env.local puesto.
    zai_api_key: str = os.getenv("ZAI_API_KEY", "")
    zai_base_url: str = os.getenv("ZAI_BASE_URL", "https://api.z.ai/api/paas/v4")
    zai_model: str = os.getenv("ZAI_MODEL", "glm-4.6")
    # Modelo de faster-whisper para el módulo voz (tiny/base/small/medium). Se descarga
    # solo la 1a vez. 'small' da buena precisión en español manteniéndose cerca de
    # tiempo real en CPU (elección del usuario 2026-07-18).
    whisper_model: str = os.getenv("WHISPER_MODEL", "small")


settings = Settings()
