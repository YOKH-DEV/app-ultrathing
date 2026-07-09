"""Cliente Supabase del motor. Escribe siempre autenticado como el propio usuario
(anon key + su access token) — nunca con la service_role key, porque este motor se
distribuye dentro del instalador de escritorio y corre en la máquina del cliente.
RLS ("own rows", ver 0001_init.sql) exige auth.uid() = user_id tanto para leer como
para insertar, así que autenticar el cliente con el token del usuario alcanza."""
from typing import Any

from supabase import Client, create_client

from app.core.config import settings


def _anon_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def _client_as(token: str) -> Client:
    """Cliente Supabase autenticado como el usuario dueño del token."""
    client = _anon_client()
    client.postgrest.auth(token)
    return client


def user_id_from_token(token: str) -> str:
    """Valida el access token del usuario y devuelve su id."""
    res = _anon_client().auth.get_user(token)
    if res is None or res.user is None:
        raise RuntimeError("Token de usuario inválido.")
    return res.user.id


def insert_download(token: str, user_id: str, title: str, filepath: str, ext: str) -> None:
    """Inserta la fila de descarga a nombre del usuario dueño del token."""
    _client_as(token).table("downloads").insert(
        {"user_id": user_id, "title": title, "filepath": filepath, "ext": ext}
    ).execute()


def upsert_job(
    token: str,
    job_id: str,
    user_id: str,
    module: str,
    status: str,
    progress: float,
    result: Any | None = None,
    error: str | None = None,
) -> None:
    """Espeja el estado de un job en la tabla `jobs` para que la web lo vea por Realtime."""
    _client_as(token).table("jobs").upsert(
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
