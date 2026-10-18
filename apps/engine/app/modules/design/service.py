"""Lógica del módulo design: un brief → una pieza gráfica editable.

Patrón OpenGenerativeUI: la IA NO devuelve una imagen ni HTML, devuelve el MISMO
contrato de elementos que el tracer (texto/rect con posición, tamaño y color hex). Así
la pieza cae 100% editable en el lienzo (custom shapes) y reusa `traceToShapes`. El
modelo va por `ai.chat` (z.ai directo → fallback Vertex GLM-5).
"""
import json
from typing import Any

from app.core.ai import chat
from app.modules.tracer.schemas import TracedElement, TraceResult


def _extract_json(raw: str) -> dict[str, Any]:
    """Extrae el objeto JSON de la respuesta del modelo (tolera fences ```json y texto)."""
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("La IA no devolvió un JSON de diseño válido.")
    try:
        data = json.loads(raw[start : end + 1])
    except json.JSONDecodeError as exc:
        raise ValueError("La IA devolvió un JSON malformado.") from exc
    if not isinstance(data, dict):
        raise ValueError("El diseño de la IA no es un objeto JSON.")
    return data


def _prompt(brief: str, width: int, height: int) -> list[dict[str, str]]:
    system = (
        "Eres un diseñador gráfico senior de marketing. Diseñas piezas con buena "
        "jerarquía visual y contraste. Devuelves SOLO un objeto JSON válido, sin "
        "markdown, sin explicaciones."
    )
    user = (
        f"Diseña una pieza de {width}x{height} px sobre:\n{brief}\n\n"
        "Devuelve un JSON con esta forma EXACTA:\n"
        '{"background":"#RRGGBB","elements":[\n'
        '  {"kind":"rect","x":0,"y":0,"w":100,"h":100,"fill":"#RRGGBB"},\n'
        '  {"kind":"text","x":0,"y":0,"w":100,"h":60,"text":"...","fontSize":48,"color":"#RRGGBB"}\n'
        "]}\n\n"
        "Reglas:\n"
        f"- Coordenadas y tamaños en píxeles, dentro de 0..{width} (x) y 0..{height} (y).\n"
        "- Entre 4 y 8 elementos: un título grande (fontSize alto), un subtítulo y una "
        "llamada a la acción; usa 'rect' para banners/bloques de color.\n"
        "- Colores en hex. Asegura buen contraste entre texto y su fondo.\n"
        "- Responde SOLO con el JSON."
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _num(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


async def generate_design(brief: str, width: int, height: int) -> dict[str, Any]:
    """Pide la pieza a la IA, valida el JSON y devuelve elementos editables (formato tracer)."""
    raw = await chat(_prompt(brief, width, height), temperature=0.7)
    data = _extract_json(raw)

    background = str(data.get("background", "#111111"))
    # El fondo va como un rect de todo el lienzo (base del z-order), luego los elementos.
    elements: list[TracedElement] = [
        TracedElement(kind="rect", x=0, y=0, w=float(width), h=float(height), fill=background)
    ]
    for el in data.get("elements", []):
        if not isinstance(el, dict):
            continue
        kind = el.get("kind")
        x, y = _num(el.get("x"), 0), _num(el.get("y"), 0)
        if kind == "text":
            fs = _num(el.get("fontSize"), 40)
            elements.append(
                TracedElement(
                    kind="text",
                    x=x,
                    y=y,
                    w=_num(el.get("w"), width * 0.6),
                    h=_num(el.get("h"), fs * 1.4),
                    text=str(el.get("text", "")),
                    font_size=fs,
                    color=str(el.get("color", "#111111")),
                )
            )
        elif kind in ("rect", "ellipse"):
            elements.append(
                TracedElement(
                    kind=kind,
                    x=x,
                    y=y,
                    w=_num(el.get("w"), 200),
                    h=_num(el.get("h"), 120),
                    fill=str(el.get("fill", "#d4af37")),
                )
            )

    result = TraceResult(
        width=width,
        height=height,
        background=background,
        palette=[],
        elements=elements,
        count=len(elements),
    )
    return result.model_dump()
