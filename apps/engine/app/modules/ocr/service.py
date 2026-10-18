"""OCR (imagen → texto). Motor principal: IA de visión (Gemini en Vertex), que lee TODO
el texto respetando el orden, los símbolos y los emojis — muy por encima de Tesseract en
capturas de pantalla, diseños y fotos. Si Vertex falla (sin red/saldo/credenciales), cae
a Tesseract local con preprocesamiento. Local y efímero: el texto se muestra y se copia,
no toca Supabase.
"""
import asyncio
import base64
import io
import json
import urllib.request
from typing import Any

import cv2
import numpy as np
import pytesseract
from PIL import Image

from app.core.config import settings
from app.core.ocr_prep import upscale_for_ocr
from app.core.vertex import access_token, project

_OCR_PROMPT = (
    "Extraé TODO el texto visible de esta imagen, exactamente como aparece, respetando el "
    "orden de lectura y los saltos de línea. Incluí símbolos y emojis tal cual. No traduzcas, "
    "no resumas, no agregues comentarios: devolvé SOLO el texto."
)


def _mime(data: bytes) -> str:
    """Detecta el tipo de imagen por sus magic bytes (para el payload de Gemini)."""
    if data[:8].startswith(b"\x89PNG"):
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/png"


def _tesseract(data: bytes) -> str:
    """Fallback local: PIL abre el formato, cv2 realza (upscale + gris + contraste) y
    Tesseract lee. `--oem 1 --psm 3` = motor LSTM + auto-layout; 'spa+eng' cubre acentos."""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    bgr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    gray = upscale_for_ocr(bgr)
    text: str = pytesseract.image_to_string(gray, lang=settings.ocr_lang, config="--oem 1 --psm 3")
    return text.strip()


def _gemini_request(url: str, token: str, body: dict[str, Any]) -> dict[str, Any]:
    """POST bloqueante a Vertex (se corre en un hilo desde la corrutina)."""
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        result: dict[str, Any] = json.loads(resp.read())
    return result


async def _gemini_ocr(data: bytes) -> str:
    """Lee el texto con Gemini (Vertex, región global). Devuelve el texto o '' si la
    respuesta viene vacía. Cualquier fallo de red/credenciales sube como excepción."""
    token = await access_token()
    proj = project()
    model = settings.vertex_vision_model
    url = (
        f"https://aiplatform.googleapis.com/v1/projects/{proj}/locations/global/"
        f"publishers/google/models/{model}:generateContent"
    )
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"inlineData": {"mimeType": _mime(data), "data": base64.b64encode(data).decode()}},
                    {"text": _OCR_PROMPT},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.0},
    }
    result = await asyncio.to_thread(_gemini_request, url, token, body)
    parts = result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts)
    return text.strip()


async def extract(data: bytes) -> str:
    """Extrae el texto de una imagen. Intenta primero la IA de visión (máxima fidelidad);
    si no está disponible, cae a Tesseract local. Lanza ValueError sólo si ambos fallan."""
    if not data:
        raise ValueError("No se recibió ninguna imagen.")

    try:
        text = await _gemini_ocr(data)
        if text:
            return text
    except Exception:  # noqa: BLE001 — sin IA seguimos con Tesseract, nunca bloqueamos
        pass

    try:
        return await asyncio.to_thread(_tesseract, data)
    except pytesseract.TesseractNotFoundError as exc:
        raise ValueError(
            "No se pudo leer el texto: la IA de visión no está disponible y Tesseract no "
            "está instalado (sudo apt install tesseract-ocr tesseract-ocr-spa)."
        ) from exc
    except OSError as exc:  # PIL no pudo abrir la imagen
        raise ValueError("No se pudo leer la imagen (formato no soportado).") from exc
