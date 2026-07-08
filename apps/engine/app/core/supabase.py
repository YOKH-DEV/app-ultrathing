"""Cliente Supabase del motor (service role). Persiste resultados a nombre del usuario."""
from functools import lru_cache
from typing import Any

from supabase import Client, create_client

from app.core.config import settings


@lru_cache(maxsize=1)
def _client() -> Client:
    if not settings.supabase_url or not settings.supabase_key:
        raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el entorno.")
    return create_client(settings.supabase_url, settings.supabase_key)


def user_id_from_token(token: str) -> str:
    """Valida el access token del usuario y devuelve su id."""
    res = _client().auth.get_user(token)
    if res is None or res.user is None:
        raise RuntimeError("Token de usuario inválido.")
    return res.user.id


def insert_download(user_id: str, title: str, filepath: str, ext: str) -> None:
    """Inserta la fila de descarga ligada al usuario (service role, user_id explícito)."""
    _client().table("downloads").insert(
        {"user_id": user_id, "title": title, "filepath": filepath, "ext": ext}
    ).execute()


def upsert_job(
    job_id: str,
    user_id: str,
    module: str,
    status: str,
    progress: float,
    result: Any | None = None,
    error: str | None = None,
) -> None:
    """Espeja el estado de un job en la tabla `jobs` para que la web lo vea por Realtime."""
    _client().table("jobs").upsert(
        {
            "id": job_id,
            "user_id": user_id,
            "module": module,
            "status": status,
            "progress": progress,
            "result": result,
            "error": error,
        }
    ).execute()
