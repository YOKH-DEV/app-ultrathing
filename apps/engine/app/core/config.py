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
    # Idiomas para el OCR (Tesseract). 'spa+eng' cubre español (con acentos) e inglés.
    ocr_lang: str = os.getenv("OCR_LANG", "spa+eng")
    zai_api_key: str = os.getenv("ZAI_API_KEY", "")
    zai_base_url: str = os.getenv("ZAI_BASE_URL", "https://api.z.ai/api/paas/v4")
    zai_model: str = os.getenv("ZAI_MODEL", "glm-4.6")
    # Respaldo de IA vía Vertex (GLM-5 MaaS). Se usa cuando la API directa de z.ai
    # falla (p. ej. 429 por saldo/paquete de recursos). Credenciales = ruta al JSON
    # del service account (SECRETO: solo en .env.local vía GOOGLE_APPLICATION_CREDENTIALS,
    # nunca al repo). Si la ruta está vacía, el respaldo queda desactivado.
    vertex_credentials_path: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    vertex_project: str = os.getenv("VERTEX_PROJECT", "")
    vertex_location: str = os.getenv("VERTEX_LOCATION", "global")
    vertex_model: str = os.getenv("VERTEX_MODEL", "zai-org/glm-5-maas")
    # Modelo de generación de imágenes en Vertex (Gemini "nano-banana", región global).
    vertex_image_model: str = os.getenv("VERTEX_IMAGE_MODEL", "gemini-2.5-flash-image")
    # Proyecto Remotion que renderiza los videos (necesita Node en la máquina).
    video_project_dir: str = os.getenv("VIDEO_PROJECT_DIR", str(_ROOT / "apps" / "video"))
    # Modelos de faster-whisper por nivel de calidad (tiny/base/small/medium). Se descargan
    # solo la 1a vez. El usuario elige el nivel en la UI de voz:
    #   rápido = tiny (casi instantáneo, menos preciso)
    #   equilibrado = base (buen balance, casi en vivo) ← default
    #   preciso = small (más exacto, más lento, se atrasa en dictados largos)
    whisper_live_model: str = os.getenv("WHISPER_LIVE_MODEL", "tiny")
    whisper_balanced_model: str = os.getenv("WHISPER_BALANCED_MODEL", "base")
    whisper_model: str = os.getenv("WHISPER_MODEL", "small")


settings = Settings()
