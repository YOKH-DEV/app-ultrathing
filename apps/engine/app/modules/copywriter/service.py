"""Lógica pura del copywriter. Llama a una API de IA (vía el helper compartido
`core.ai`) y devuelve el copy. NO toca disco ni Supabase: el resultado es efímero,
se genera bajo demanda y se muestra en pantalla (T4.1). Surface 'both': el mismo
endpoint lo consumen el escritorio y la web.
"""
from app.core.ai import chat
from .schemas import CopyResult, Format, RewriteAction, Tone

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


_ACTION_HINT: dict[RewriteAction, str] = {
    "acortar": "Reescribe el texto más corto y conciso, conservando el mensaje.",
    "alargar": "Expande el texto con más detalle y fuerza, sin cambiar el tema.",
    "profesional": "Reescribe el texto en un tono profesional y pulido.",
    "persuasivo": "Reescribe el texto para que sea más persuasivo y orientado a la venta.",
    "corregir": "Corrige la ortografía y gramática del texto, sin cambiar su sentido ni tono.",
    "traducir_en": "Traduce el texto al inglés.",
}


async def rewrite(text: str, action: RewriteAction) -> dict[str, str]:
    """Aplica una acción rápida de IA a un texto ya existente (quick action del lienzo).
    Devuelve solo el texto resultante. Lanza ValueError si la IA no responde."""
    system = (
        "Eres un editor de copy de marketing experto que trabaja en español. "
        "Devuelves SOLO el texto resultante, sin comillas, sin explicaciones ni comentarios."
    )
    user = f"{_ACTION_HINT[action]}\n\nTexto:\n{text}"
    out = await chat(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.7,
    )
    return CopyResult(text=out).model_dump()
