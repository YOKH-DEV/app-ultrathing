"""Auth compartida para Vertex AI con el service account. La usan los módulos que
pegan directo contra Vertex (imagegen); el helper de chat (core.ai) tiene su propia
copia por ahora. Token cacheado y refrescado por google-auth."""
import asyncio

from app.core.config import settings

_creds = None  # google.oauth2.service_account.Credentials, cacheado entre llamadas


def _mint() -> str:
    global _creds
    import google.auth.transport.requests as greq
    from google.oauth2 import service_account

    if not settings.vertex_credentials_path:
        raise ValueError("Falta GOOGLE_APPLICATION_CREDENTIALS para usar Vertex.")
    if _creds is None:
        _creds = service_account.Credentials.from_service_account_file(  # type: ignore[no-untyped-call]
            settings.vertex_credentials_path,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    if not _creds.valid:
        _creds.refresh(greq.Request())
    return str(_creds.token)


async def access_token() -> str:
    """Token OAuth2 del service account (sincrónico → hilo, no bloquea el loop)."""
    return await asyncio.to_thread(_mint)


def project() -> str:
    """Proyecto GCP: el de la env si está, si no el que trae el propio service account."""
    if settings.vertex_project:
        return settings.vertex_project
    return getattr(_creds, "project_id", "") or ""
