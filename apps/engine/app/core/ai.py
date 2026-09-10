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
from app.core import models_store

# Credenciales de Vertex cacheadas entre llamadas (google-auth refresca el token solo).
_vertex_creds = None


async def chat(messages: list[dict[str, str]], temperature: float = 0.7) -> str:
    """Envía mensajes a la IA y devuelve el texto.

    Si hay un modelo activo en ~/Ultrathing/models.json, se usa ese (open source:
    cada quien conecta el suyo). Si no, z.ai y luego Vertex del .env.
    """
    errors: list[str] = []
    active = models_store.active_raw()
    if active:
        try:
            return await _chat_configured(active, messages, temperature)
        except ValueError as exc:
            raise ValueError(f"{active.get('name') or 'modelo activo'}: {exc}") from exc

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


async def test_model(raw: dict[str, Any]) -> dict[str, Any]:
    """Prueba un modelo (guardado o el del formulario) con un ping corto."""
    try:
        text = await _chat_configured(
            raw,
            [{"role": "user", "content": "Respondé con la palabra: ok"}],
            0.0,
        )
        preview = (text or "").strip().replace("\n", " ")[:80]
        return {"ok": True, "preview": preview or "(vacío)"}
    except Exception as exc:  # noqa: BLE001 — la UI muestra el motivo
        return {"ok": False, "error": str(exc)[:240]}


async def _chat_configured(
    raw: dict[str, Any],
    messages: list[dict[str, str]],
    temperature: float,
) -> str:
    kind = raw.get("kind")
    model = (raw.get("model") or "").strip()
    if not model:
        raise ValueError("falta el nombre del modelo")
    if kind == "openai":
        base = (raw.get("base_url") or "").rstrip("/")
        key = raw.get("api_key") or ""
        if not base:
            raise ValueError("falta base_url")
        return await _chat_openai(base, key, model, messages, temperature)
    if kind == "vertex":
        return await _chat_vertex(
            messages,
            temperature,
            creds_info=raw.get("credentials") if isinstance(raw.get("credentials"), dict) else None,
            project=raw.get("project") or None,
            location=raw.get("location") or None,
            model=model,
        )
    raise ValueError(f"kind desconocido: {kind}")


async def _chat_openai(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
) -> str:
    payload = {"model": model, "messages": messages, "temperature": temperature}
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    async with httpx.AsyncClient(timeout=45) as client:
        res = await client.post(f"{base_url}/chat/completions", json=payload, headers=headers)
    if res.status_code != 200:
        raise ValueError(f"respondió {res.status_code}: {res.text[:200]}")
    return _text_from(res.json())


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


def _vertex_project(creds_info: dict[str, Any] | None = None) -> str:
    """Proyecto GCP. Si hay JSON de modelo activo, manda ese project_id (no el del .env)."""
    if creds_info and creds_info.get("project_id"):
        return str(creds_info["project_id"])
    if settings.vertex_project:
        return settings.vertex_project
    return getattr(_vertex_creds, "project_id", "") or ""


def _vertex_token(creds_info: dict[str, Any] | None = None) -> str:
    """Mintea (y refresca) el token OAuth2 del service account. Sincrónico: se llama
    dentro de asyncio.to_thread para no bloquear el event loop."""
    global _vertex_creds
    import google.auth.transport.requests as greq
    from google.oauth2 import service_account

    if creds_info:
        creds = service_account.Credentials.from_service_account_info(  # type: ignore[no-untyped-call]
            creds_info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        if not creds.valid:
            creds.refresh(greq.Request())
        return str(creds.token)

    if _vertex_creds is None:
        _vertex_creds = service_account.Credentials.from_service_account_file(  # type: ignore[no-untyped-call]
            settings.vertex_credentials_path,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    if not _vertex_creds.valid:
        _vertex_creds.refresh(greq.Request())
    return str(_vertex_creds.token)


async def _chat_vertex(
    messages: list[dict[str, str]],
    temperature: float,
    creds_info: dict[str, Any] | None = None,
    project: str | None = None,
    location: str | None = None,
    model: str | None = None,
) -> str:
    """GLM-5 (MaaS) sobre Vertex AI, endpoint OpenAPI compatible con OpenAI."""
    token = await asyncio.to_thread(_vertex_token, creds_info)
    proj = project or _vertex_project(creds_info)
    if not proj:
        raise ValueError("falta VERTEX_PROJECT y el JSON no trae project_id")

    loc = location or settings.vertex_location
    host = "aiplatform.googleapis.com" if loc == "global" else f"{loc}-aiplatform.googleapis.com"
    url = f"https://{host}/v1/projects/{proj}/locations/{loc}/endpoints/openapi/chat/completions"

    payload = {
        "model": model or settings.vertex_model,
        "messages": messages,
        "temperature": temperature,
    }
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
