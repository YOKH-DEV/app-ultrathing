"""Lógica pura del OCR (imagen → texto) con Tesseract. Local, no toca Supabase:
el texto es efímero (se muestra y se copia). Soporta capturas de pantalla y fotos.
"""
import asyncio
import io

import pytesseract
from PIL import Image

from app.core.config import settings


def _extract(data: bytes) -> str:
    img = Image.open(io.BytesIO(data))
    # 'spa+eng' por defecto: reconoce español (con tildes/ñ) e inglés.
    text: str = pytesseract.image_to_string(img, lang=settings.ocr_lang)
    return text.strip()


async def extract(data: bytes) -> str:
    """Extrae el texto de una imagen. Lanza ValueError con mensaje claro si la
    imagen es inválida o si Tesseract no está instalado en el sistema."""
    if not data:
        raise ValueError("No se recibió ninguna imagen.")
    try:
        return await asyncio.to_thread(_extract, data)
    except pytesseract.TesseractNotFoundError as exc:
        raise ValueError(
            "Tesseract no está instalado. Corre: "
            "sudo apt install tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng"
        ) from exc
    except OSError as exc:  # PIL no pudo abrir la imagen
        raise ValueError("No se pudo leer la imagen (formato no soportado).") from exc
