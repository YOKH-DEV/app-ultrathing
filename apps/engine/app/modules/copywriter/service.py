"""Lógica pura del copywriter. Llama a una API de IA (vía el helper compartido
`core.ai`) y devuelve el copy. NO toca disco ni Supabase: el resultado es efímero,
se genera bajo demanda y se muestra en pantalla (T4.1). Surface 'both': el mismo
endpoint lo consumen el escritorio y la web.
"""
from app.core.ai import chat
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
    """Pide el copy al proveedor de IA. Lanza ValueError si no hay key o falla."""
    text = await chat(_prompt(brief, tone, format), temperature=0.8)
    return CopyResult(text=text).model_dump()
