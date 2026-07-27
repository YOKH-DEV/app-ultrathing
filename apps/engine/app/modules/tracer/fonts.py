"""Detección de familia tipográfica (Google Font) con Gemini en Vertex AI.

Enriquecimiento BEST-EFFORT del tracer: la fuente exacta no se puede recuperar de un
raster, así que le mostramos la imagen COMPLETA a un Gemini multimodal junto con los
textos y sus cajas, y le pedimos la Google Font más parecida para cada uno. Una sola
llamada por imagen (todos los textos en el mismo request) para minimizar costo/latencia.

Regla de oro: NUNCA rompe la descomposición. Si Vertex falla, tarda o devuelve algo no
parseable, se captura y los textos quedan con `font_family = None` (el cliente cae a una
fuente por defecto). Es un plus, jamás un bloqueo.
"""
import base64
import json
import logging
import re
from typing import Any

import cv2
import httpx
import numpy as np

from app.core.config import settings
from app.core.vertex import access_token, project
from .schemas import TracedElement

logger = logging.getLogger(__name__)

# Familias Google Fonts válidas por categoría — sirven de "menú" para el modelo y de
# whitelist defensiva al parsear (evita que un nombre inventado llegue al cliente).
_GOOGLE_FONTS: dict[str, tuple[str, ...]] = {
    "sans-serif": (
        "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Inter", "Nunito",
        "Raleway", "Work Sans", "Oswald", "Bebas Neue", "Archivo", "Barlow", "Rubik",
        "DM Sans", "Manrope", "Kanit", "Anton", "Josefin Sans", "Quicksand",
    ),
    "serif": (
        "Playfair Display", "Merriweather", "Lora", "PT Serif", "Roboto Slab",
        "Cormorant Garamond", "Libre Baskerville", "EB Garamond", "Bitter",
        "Crimson Text", "Noto Serif", "Source Serif 4", "Domine",
    ),
    "display": (
        "Bebas Neue", "Anton", "Righteous", "Alfa Slab One", "Bungee", "Fredoka",
        "Lobster", "Pacifico", "Abril Fatface", "Passion One",
    ),
    "handwriting": (
        "Dancing Script", "Pacifico", "Caveat", "Shadows Into Light", "Satisfy",
        "Great Vibes", "Sacramento", "Kalam", "Indie Flower",
    ),
    "monospace": (
        "Roboto Mono", "Source Code Pro", "JetBrains Mono", "Space Mono",
        "IBM Plex Mono", "Fira Code", "Inconsolata",
    ),
}
_KNOWN_FAMILIES: set[str] = {f for fams in _GOOGLE_FONTS.values() for f in fams}
# Índice case-insensitive para normalizar la respuesta del modelo a la grafía canónica.
_FAMILY_BY_LOWER: dict[str, str] = {f.lower(): f for f in _KNOWN_FAMILIES}
_CATALOG = "\n".join(f"- {cat}: {', '.join(fams)}" for cat, fams in _GOOGLE_FONTS.items())


def _catalog_prompt(items: list[dict[str, Any]]) -> str:
    """Prompt de una sola pasada: imagen + textos con su índice/bbox → JSON con la fuente."""
    texts = "\n".join(
        f'  {it["i"]}: "{it["text"]}" (bbox x={it["x"]} y={it["y"]} w={it["w"]} h={it["h"]})'
        for it in items
    )
    return (
        "You are a typography expert. The attached image is a graphic design. For each "
        "text listed below (identified by its index and pixel bounding box in the image), "
        "look at how the letters are actually rendered and pick the SINGLE closest match "
        "from Google Fonts.\n\n"
        "Available Google Fonts by category:\n"
        f"{_CATALOG}\n\n"
        "Texts:\n"
        f"{texts}\n\n"
        "Respond with ONLY a JSON array, no prose, no markdown fences. One object per "
        'text: [{"i": <index>, "family": "<exact Google Font name>", '
        '"category": "serif|sans-serif|display|handwriting|monospace", '
        '"weight": 400|700, "italic": true|false}]. '
        "The family MUST be one of the names listed above, written exactly."
    )


def _png_b64(bgr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", bgr)
    if not ok:
        raise ValueError("No se pudo codificar la imagen a PNG para Gemini.")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def _text_from(data: dict[str, Any]) -> str:
    """Concatena el texto de todos los parts de la primera candidata de generateContent."""
    parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts).strip()


def _parse_array(raw: str) -> list[dict[str, Any]]:
    """Parseo robusto: quita fences ```json, recorta al primer array y decodifica."""
    txt = raw.strip()
    txt = re.sub(r"^```(?:json)?\s*|\s*```$", "", txt, flags=re.IGNORECASE).strip()
    start, end = txt.find("["), txt.rfind("]")
    if start != -1 and end != -1 and end > start:
        txt = txt[start : end + 1]
    parsed = json.loads(txt)
    if not isinstance(parsed, list):
        raise ValueError("La respuesta no es un array JSON.")
    return [x for x in parsed if isinstance(x, dict)]


def _canonical_family(name: Any) -> str | None:
    """Normaliza a la grafía canónica de Google Fonts; None si no es una familia conocida."""
    if not isinstance(name, str):
        return None
    return _FAMILY_BY_LOWER.get(name.strip().lower())


async def _ask_gemini(b64: str, prompt: str) -> str:
    """Una llamada a Gemini (visión→texto) en Vertex. Devuelve el texto crudo de la respuesta."""
    token = await access_token()
    proj = project()
    if not proj:
        raise ValueError("Falta VERTEX_PROJECT (o project_id en el service account).")

    model = settings.vertex_vision_model
    url = (
        f"https://aiplatform.googleapis.com/v1/projects/{proj}"
        f"/locations/global/publishers/google/models/{model}:generateContent"
    )
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"inlineData": {"mimeType": "image/png", "data": b64}},
                    {"text": prompt},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.0, "responseMimeType": "application/json"},
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(url, json=body, headers=headers)
    if res.status_code != 200:
        raise ValueError(f"Vertex (visión) respondió {res.status_code}: {res.text[:200]}")
    return _text_from(res.json())


async def detect_fonts(bgr: np.ndarray, elements: list[TracedElement]) -> None:
    """Enriquece EN SITIO los textos de `elements` con la Google Font más parecida.

    Una sola llamada a Gemini con la imagen completa + todos los textos. Best-effort:
    cualquier fallo se traga y deja `font_family = None`. No lanza nunca.
    """
    texts = [el for el in elements if el.kind == "text" and (el.text or "").strip()]
    if not texts:
        return

    try:
        items = [
            {
                "i": idx,
                "text": (el.text or "")[:80],
                "x": round(el.x),
                "y": round(el.y),
                "w": round(el.w),
                "h": round(el.h),
            }
            for idx, el in enumerate(texts)
        ]
        raw = await _ask_gemini(_png_b64(bgr), _catalog_prompt(items))
        rows = _parse_array(raw)
    except Exception as exc:  # noqa: BLE001 — best-effort: nunca romper la descomposición
        logger.warning("Detección de fuentes deshabilitada (Vertex/Gemini): %s", exc)
        return

    by_index = {r.get("i"): r for r in rows if isinstance(r.get("i"), int)}
    for idx, el in enumerate(texts):
        row = by_index.get(idx)
        if not row:
            continue
        family = _canonical_family(row.get("family"))
        if not family:
            continue
        el.font_family = family
        weight = row.get("weight")
        if weight in (400, 700):
            el.font_weight = weight
