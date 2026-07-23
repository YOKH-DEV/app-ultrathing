"""Lógica pura del tracer: imagen raster → objetos editables (texto + fondo + paleta).

Todo el trabajo de visión corre acá (motor), nunca en el cliente. Pipeline:
  1. OCR con Tesseract → bloques de texto con bbox, tamaño y color.
  2. Inpaint del texto (OpenCV) → fondo reconstruido y limpio, sin los textos.
  3. Paleta dominante (k-means) para recolorear la pieza.
El cliente solo monta los elementos como shapes editables en el lienzo.

Encuadre honesto: descompone bien flyers, posts, portadas y logos (texto sobre fondo
liso o simple). Fotos complejas se tratan como fondo, no se "descomponen".
"""
import asyncio
import base64
from collections.abc import Callable
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import pytesseract
from sklearn.cluster import KMeans

from app.core.config import settings
from app.core.paths import unique_path
from app.core.supabase import insert_asset
from .schemas import TracedElement, TraceResult

_MIN_CONF = 45  # confianza mínima de Tesseract para aceptar una palabra


def _hex(bgr: "np.ndarray | tuple[int, int, int]") -> str:
    """Convierte un color BGR (OpenCV) a hex '#rrggbb'."""
    b, g, r = (int(c) for c in bgr)
    return f"#{r:02x}{g:02x}{b:02x}"


def _dominant_pair_color(crop: np.ndarray) -> str:
    """Color del texto en un recorte: 2-means separa texto de su fondo local; el
    cluster más chico (menos píxeles) suele ser el texto. Robusto a claro/oscuro."""
    pixels = crop.reshape(-1, 3).astype(np.float32)
    if len(pixels) < 2:
        return _hex(pixels[0]) if len(pixels) else "#000000"
    km = KMeans(n_clusters=2, n_init=4, random_state=0).fit(pixels)
    counts = np.bincount(km.labels_, minlength=2)
    text_cluster = int(np.argmin(counts))
    return _hex(km.cluster_centers_[text_cluster])


def _ocr_elements(rgb: np.ndarray, bgr: np.ndarray) -> tuple[list[TracedElement], list[tuple[int, int, int, int]]]:
    """Extrae bloques de texto (agrupados por línea) con bbox, tamaño y color.
    Devuelve los elementos y las cajas (para enmascararlas en el inpaint)."""
    data = pytesseract.image_to_data(
        rgb, lang=settings.ocr_lang, output_type=pytesseract.Output.DICT
    )
    groups: dict[tuple[int, int, int], dict[str, Any]] = {}
    for i, word in enumerate(data["text"]):
        word = word.strip()
        if not word or int(data["conf"][i]) < _MIN_CONF:
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        g = groups.setdefault(
            key, {"x0": x, "y0": y, "x1": x + w, "y1": y + h, "words": [], "heights": []}
        )
        g["x0"] = min(g["x0"], x)
        g["y0"] = min(g["y0"], y)
        g["x1"] = max(g["x1"], x + w)
        g["y1"] = max(g["y1"], y + h)
        g["words"].append(word)
        g["heights"].append(h)

    elements: list[TracedElement] = []
    boxes: list[tuple[int, int, int, int]] = []
    for g in groups.values():
        x0, y0, x1, y1 = g["x0"], g["y0"], g["x1"], g["y1"]
        if x1 <= x0 or y1 <= y0:
            continue
        crop = bgr[max(0, y0) : y1, max(0, x0) : x1]
        color = _dominant_pair_color(crop) if crop.size else "#111111"
        elements.append(
            TracedElement(
                kind="text",
                x=float(x0),
                y=float(y0),
                w=float(x1 - x0),
                h=float(y1 - y0),
                text=" ".join(g["words"]),
                font_size=float(int(np.median(g["heights"]))),
                color=color,
            )
        )
        boxes.append((x0, y0, x1, y1))
    return elements, boxes


def _inpaint_background(bgr: np.ndarray, boxes: list[tuple[int, int, int, int]]) -> np.ndarray:
    """Borra los textos y reconstruye el fondo debajo (INPAINT_TELEA)."""
    if not boxes:
        return bgr
    mask = np.zeros(bgr.shape[:2], dtype=np.uint8)
    for x0, y0, x1, y1 in boxes:
        # Margen proporcional a la altura del texto: cubre bien remates y antialias, así
        # no queda "texto fantasma" del original bajo el texto editable nuevo.
        pad = max(4, int((y1 - y0) * 0.25))
        cv2.rectangle(mask, (x0 - pad, y0 - pad), (x1 + pad, y1 + pad), 255, -1)
    return cv2.inpaint(bgr, mask, 5, cv2.INPAINT_TELEA)


def _flat_background(bgr: np.ndarray) -> str | None:
    """Si las 4 esquinas son casi del mismo color, la imagen tiene fondo plano → hex."""
    h, w = bgr.shape[:2]
    s = max(6, min(h, w) // 20)
    corners = np.vstack(
        [
            bgr[:s, :s].reshape(-1, 3),
            bgr[:s, -s:].reshape(-1, 3),
            bgr[-s:, :s].reshape(-1, 3),
            bgr[-s:, -s:].reshape(-1, 3),
        ]
    )
    if corners.std(axis=0).mean() > 18:  # esquinas muy dispares → no es plano
        return None
    return _hex(corners.mean(axis=0))


def _palette(bgr: np.ndarray, k: int = 5) -> list[str]:
    """Colores dominantes (k-means sobre una versión reducida)."""
    small = cv2.resize(bgr, (80, 80), interpolation=cv2.INTER_AREA).reshape(-1, 3).astype(np.float32)
    k = min(k, len(np.unique(small, axis=0)))
    if k < 1:
        return []
    km = KMeans(n_clusters=k, n_init=4, random_state=0).fit(small)
    order = np.argsort(-np.bincount(km.labels_, minlength=k))  # más frecuentes primero
    return [_hex(km.cluster_centers_[i]) for i in order]


def _png_dataurl(bgr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", bgr)
    if not ok:
        return ""
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode("ascii")


def _decompose(data: bytes, filename: str, on_progress: Callable[[float], None]) -> tuple[TraceResult, bytes]:
    """Descompone la imagen. Devuelve el resultado y el PNG del fondo limpio (para persistir)."""
    on_progress(10)
    bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("No se pudo leer la imagen (formato no soportado).")
    h, w = bgr.shape[:2]
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    text_elements, boxes = _ocr_elements(rgb, bgr)
    on_progress(45)

    clean = _inpaint_background(bgr, boxes)
    on_progress(70)

    background = _flat_background(clean)
    palette = _palette(clean)
    on_progress(90)

    # Elemento de fondo (imagen reconstruida) al fondo del z-order, luego los textos.
    bg_png = cv2.imencode(".png", clean)[1].tobytes()
    bg_element = TracedElement(kind="image", x=0, y=0, w=float(w), h=float(h), src=_png_dataurl(clean))
    elements = [bg_element, *text_elements]

    result = TraceResult(
        width=w,
        height=h,
        background=background,
        palette=palette,
        elements=elements,
        count=len(elements),
    )
    on_progress(100)
    return result, bg_png


def _persist(token: str, user_id: str, filename: str, bg_png: bytes) -> None:
    """Guarda el fondo reconstruido como asset del usuario."""
    out_dir = Path(settings.download_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{Path(filename).stem or 'imagen'}-fondo"
    out_path = unique_path(out_dir, stem, "png")
    out_path.write_bytes(bg_png)
    insert_asset(token, user_id, "tracer", out_path.stem, str(out_path), "image/png")


async def decompose(
    data: bytes,
    filename: str,
    report: Callable[[float], None],
    user_id: str | None = None,
    token: str | None = None,
) -> dict[str, Any]:
    """Descompone la imagen en un hilo (OpenCV/Tesseract bloquean). Persiste el fondo si hay usuario."""
    result, bg_png = await asyncio.to_thread(_decompose, data, filename, report)
    if user_id and token:
        await asyncio.to_thread(_persist, token, user_id, filename, bg_png)
    return result.model_dump()
