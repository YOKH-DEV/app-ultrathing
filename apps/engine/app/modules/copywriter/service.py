"""Lógica pura del copywriter. Llama a una API de IA (z.ai / GLM, compatible con
OpenAI) y devuelve el copy. NO toca disco ni Supabase: el resultado es efímero,
se genera bajo demanda y se muestra en pantalla (T4.1). Surface 'both': el mismo
endpoint lo consumen el escritorio y la web.
"""
import httpx

from app.core.config import settings
from .schemas import CopyResult, Format, Tone

_FORMAT_HINT: dict[Format, str] = {
    "post": "un post para redes sociales, con un gancho al inicio y una llamada a la acción.",
    "anuncio": "un anuncio publicitario breve y directo, orientado a la conversión.",
    "email": "un email de marketing con asunto y cuerpo.",
    "titulares": "una lista de 5 titulares alternativos, uno por línea.",
}


def _prompt(brief: str, tone: Tone, format: Format) -> list[dict[str, str]]:
    system = (
        "Eres un copywriter de marketing experto que escribe en español. "
        "Devuelves solo el copy pedido, sin explicaciones ni comentarios."
    )
    user = (
        f"Escribe {_FORMAT_HINT[format]}\n"
        f"Tono: {tone}.\n"
        f"Tema / instrucciones:\n{brief}"
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


async def generate(brief: str, tone: Tone, format: Format) -> dict[str, str]:
    """Pide el copy al proveedor de IA. Lanza ValueError si no hay key configurada."""
    if not settings.zai_api_key:
        raise ValueError(
            "Falta ZAI_API_KEY en .env.local — el copywriter necesita la clave del proveedor de IA."
        )

    payload = {
        "model": settings.zai_model,
        "messages": _prompt(brief, tone, format),
        "temperature": 0.8,
    }
    headers = {"Authorization": f"Bearer {settings.zai_api_key}"}

    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            f"{settings.zai_base_url}/chat/completions", json=payload, headers=headers
        )
    if res.status_code != 200:
        raise ValueError(f"El proveedor de IA respondió {res.status_code}: {res.text[:200]}")

    data = res.json()
    text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
    if not text:
        raise ValueError("El proveedor de IA no devolvió texto.")
    return CopyResult(text=text).model_dump()
