"""Lógica del módulo imagegen: prompt → imagen PNG (dataURL) con Gemini en Vertex.

Petición corta (request/response): un solo llamado a Vertex, ~5-15s. Devuelve la imagen
inline (dataURL) para que el cliente la incruste en el lienzo sin round-trip extra.
"""
from typing import Any

import httpx

from app.core.config import settings
from app.core.vertex import access_token, project
from .schemas import ImageResult


def _find_image(data: dict[str, Any]) -> str | None:
    """Extrae el primer inlineData (imagen base64) de la respuesta generateContent."""
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                return f"data:{mime};base64,{inline['data']}"
    return None


async def generate(prompt: str) -> dict[str, str]:
    """Genera una imagen desde el prompt. Lanza ValueError si Vertex no responde imagen."""
    token = await access_token()
    proj = project()
    if not proj:
        raise ValueError("Falta VERTEX_PROJECT (o project_id en el service account).")

    model = settings.vertex_image_model
    url = (
        f"https://aiplatform.googleapis.com/v1/projects/{proj}"
        f"/locations/global/publishers/google/models/{model}:generateContent"
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": f"Generate an image: {prompt}"}]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=120) as client:
        res = await client.post(url, json=body, headers=headers)
    if res.status_code != 200:
        raise ValueError(f"Vertex (imagen) respondió {res.status_code}: {res.text[:200]}")

    image = _find_image(res.json())
    if not image:
        raise ValueError("La IA no devolvió una imagen.")
    return ImageResult(image=image).model_dump()
