"""Cliente compartido del proveedor de IA (z.ai / GLM, API compatible con OpenAI).
Un solo lugar para hablar con la IA: lo reusan copywriter, voz, etc.

Estrategia: se intenta primero la API directa de z.ai (barata, pay-per-token). Si esa
falla —típicamente 429 por saldo/paquete de recursos agotado— se hace fallback a GLM-5
en Vertex (MaaS), que va contra otra cuenta/facturación. Así el copywriter y el pulido
de voz siguen vivos aunque una de las dos vías se quede sin crédito.
"""
import asyncio
from typing import Any

import httpx

from app.core.config import settings

# Credenciales de Vertex cacheadas entre llamadas (google-auth refresca el token solo).
_vertex_creds = None


async def chat(messages: list[dict[str, str]], temperature: float = 0.7) -> str:
    """Envía mensajes a la IA y devuelve el texto. Intenta z.ai directa y, si falla,
    cae a Vertex GLM-5. Lanza ValueError solo si NINGUNA vía funciona."""
    errors: list[str] = []

    if settings.zai_api_key:
        try:
            return await _chat_zai(messages, temperature)
        except ValueError as exc:
            errors.append(f"z.ai: {exc}")
    else:
        errors.append("z.ai: sin ZAI_API_KEY")

    if _vertex_enabled():
        try:
            return await _chat_vertex(messages, temperature)
        except ValueError as exc:
            errors.append(f"vertex: {exc}")
    else:
        errors.append("vertex: sin credenciales (GOOGLE_APPLICATION_CREDENTIALS)")

    raise ValueError("Ninguna IA respondió → " + " | ".join(errors))


async def _chat_zai(messages: list[dict[str, str]], temperature: float) -> str:
    """API directa de z.ai (compatible con OpenAI)."""
    payload = {"model": settings.zai_model, "messages": messages, "temperature": temperature}
    headers = {"Authorization": f"Bearer {settings.zai_api_key}"}

    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            f"{settings.zai_base_url}/chat/completions", json=payload, headers=headers
        )
    if res.status_code != 200:
        raise ValueError(f"respondió {res.status_code}: {res.text[:200]}")
    return _text_from(res.json())


def _vertex_enabled() -> bool:
    return bool(settings.vertex_credentials_path)


def _vertex_project() -> str:
    """Proyecto GCP: el de la env si está, si no el que trae el propio service account."""
    if settings.vertex_project:
        return settings.vertex_project
    return getattr(_vertex_creds, "project_id", "") or ""


def _vertex_token() -> str:
    """Mintea (y refresca) el token OAuth2 del service account. Sincrónico: se llama
    dentro de asyncio.to_thread para no bloquear el event loop."""
    global _vertex_creds
    import google.auth.transport.requests as greq
    from google.oauth2 import service_account

    if _vertex_creds is None:
        _vertex_creds = service_account.Credentials.from_service_account_file(  # type: ignore[no-untyped-call]
            settings.vertex_credentials_path,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    if not _vertex_creds.valid:
        _vertex_creds.refresh(greq.Request())
    return str(_vertex_creds.token)


async def _chat_vertex(messages: list[dict[str, str]], temperature: float) -> str:
    """GLM-5 (MaaS) sobre Vertex AI, endpoint OpenAPI compatible con OpenAI."""
    token = await asyncio.to_thread(_vertex_token)
    project = _vertex_project()
    if not project:
        raise ValueError("falta VERTEX_PROJECT y el JSON no trae project_id")

    loc = settings.vertex_location
    host = "aiplatform.googleapis.com" if loc == "global" else f"{loc}-aiplatform.googleapis.com"
    url = f"https://{host}/v1/projects/{project}/locations/{loc}/endpoints/openapi/chat/completions"

    payload = {"model": settings.vertex_model, "messages": messages, "temperature": temperature}
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(url, json=payload, headers=headers)
    if res.status_code != 200:
        raise ValueError(f"respondió {res.status_code}: {res.text[:200]}")
    return _text_from(res.json())


def _text_from(data: dict[str, Any]) -> str:
    """Extrae el texto de una respuesta estilo OpenAI. Lanza ValueError si viene vacía."""
    text: str = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
    if not text:
        raise ValueError("no devolvió texto")
    return text
