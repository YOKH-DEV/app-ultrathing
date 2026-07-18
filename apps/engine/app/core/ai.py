"""Cliente compartido del proveedor de IA (z.ai / GLM, API compatible con OpenAI).
Un solo lugar para hablar con la IA: lo reusan copywriter, voz, etc.
"""
import httpx

from app.core.config import settings


async def chat(messages: list[dict[str, str]], temperature: float = 0.7) -> str:
    """Envía mensajes al proveedor de IA y devuelve el texto de la respuesta.

    Lanza ValueError si no hay key configurada o el proveedor responde con error
    (incluye saldo insuficiente) — el llamador decide si lo propaga o hace fallback.
    """
    if not settings.zai_api_key:
        raise ValueError("Falta ZAI_API_KEY en .env.local — se necesita la clave del proveedor de IA.")

    payload = {"model": settings.zai_model, "messages": messages, "temperature": temperature}
    headers = {"Authorization": f"Bearer {settings.zai_api_key}"}

    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            f"{settings.zai_base_url}/chat/completions", json=payload, headers=headers
        )
    if res.status_code != 200:
        raise ValueError(f"El proveedor de IA respondió {res.status_code}: {res.text[:200]}")

    data = res.json()
    text: str = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
    if not text:
        raise ValueError("El proveedor de IA no devolvió texto.")
    return text
