"""Tracer NO DESTRUCTIVO: imagen raster → la MISMA imagen + textos editables encima.

Filosofía (2026-07-27): el diseño debe quedar **idéntico al original**, solo que editable.
Por eso NO reconstruimos ni tocamos el fondo. Pipeline:
  1. OCR con Tesseract → cada bloque de texto con bbox, tamaño, color y peso aproximado.
  2. Por cada texto se calcula un `patch`: un recorte del fondo LOCAL con el texto ya
     borrado (relleno del color que lo rodea; inpaint solo si el borde es texturado).
  3. El fondo es la imagen ORIGINAL intacta; los textos van como overlays invisibles.

En el cliente, cada texto no se pinta hasta que el usuario lo edita: mientras tanto se ve
el pixel original (tipografía real incluida). Al editar, el `patch` tapa esa zona puntual
y aparece el texto nuevo — el resto del diseño nunca se altera.

Encuadre honesto: la fuente EXACTA no se puede recuperar de un raster; al editar un texto
se usa la familia/peso más parecidos. Sin editar, se ve la tipografía real del original.
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
from app.core.ocr_prep import enhance_gray
from app.core.paths import unique_path
from app.core.supabase import insert_asset
from .fonts import detect_fonts
from .schemas import TracedElement, TraceResult

_MIN_CONF = 35  # confianza mínima de Tesseract (bajo → captura más texto tenue, menos huecos)


def _hex(bgr: "np.ndarray | tuple[int, int, int]") -> str:
    """Convierte un color BGR (OpenCV) a hex '#rrggbb'."""
    b, g, r = (int(c) for c in bgr)
    return f"#{r:02x}{g:02x}{b:02x}"


def _png_dataurl(bgr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", bgr)
    if not ok:
        return ""
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode("ascii")


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


def _text_weight(crop: np.ndarray, text_hex: str) -> int:
    """Peso aproximado (400/700) por densidad de trazo: fracción de píxeles del recorte
    cercanos al color del texto. Mucha tinta → negrita. Heurística, no exacta."""
    if crop.size == 0:
        return 400
    h = text_hex.lstrip("#")
    tr, tg, tb = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    target = np.array([tb, tg, tr], dtype=int)  # BGR
    dist = np.linalg.norm(crop.astype(int) - target, axis=2)
    density = float((dist < 60).mean())
    return 700 if density > 0.22 else 400


def _local_patch(
    bgr: np.ndarray, x0: int, y0: int, x1: int, y1: int
) -> tuple[str, str]:
    """Reconstruye SOLO la caja del texto (sin el texto) y devuelve (patch dataURL, bg_hex).

    Rellena con el color del anillo que rodea la caja si ese borde es uniforme (típico en
    piezas de diseño); si el borde es texturado (foto), hace inpaint local. El recorte
    devuelto cubre exactamente [x0:x1, y0:y1] para que el cliente lo pinte sobre esa zona.
    """
    h, w = bgr.shape[:2]
    m = max(6, int((y1 - y0) * 0.5))
    rx0, ry0, rx1, ry1 = max(0, x0 - m), max(0, y0 - m), min(w, x1 + m), min(h, y1 + m)
    ring = np.concatenate(
        [
            bgr[ry0:y0, rx0:rx1].reshape(-1, 3),
            bgr[y1:ry1, rx0:rx1].reshape(-1, 3),
            bgr[y0:y1, rx0:x0].reshape(-1, 3),
            bgr[y0:y1, x1:rx1].reshape(-1, 3),
        ]
    )
    bg_bgr = np.median(ring, axis=0) if len(ring) else np.array([255, 255, 255])
    bg_hex = _hex(bg_bgr)

    patch: np.ndarray
    if len(ring) and ring.std(axis=0).mean() < 22:
        # Borde uniforme → parche de color plano exacto al fondo local.
        patch = np.full((y1 - y0, x1 - x0, 3), bg_bgr, dtype=np.uint8)
    else:
        # Borde texturado → inpaint local sobre la región extendida y recorte de la caja.
        region = bgr[ry0:ry1, rx0:rx1].copy()
        mask = np.zeros(region.shape[:2], dtype=np.uint8)
        mask[y0 - ry0 : y1 - ry0, x0 - rx0 : x1 - rx0] = 255
        filled = cv2.inpaint(region, mask, 5, cv2.INPAINT_TELEA)
        patch = filled[y0 - ry0 : y1 - ry0, x0 - rx0 : x1 - rx0]

    return _png_dataurl(patch), bg_hex


def _ocr_elements(
    bgr: np.ndarray,
) -> tuple[list[TracedElement], list[tuple[int, int, int, int]]]:
    """Extrae bloques de texto (agrupados por línea) como capas editables/movibles: bbox,
    tamaño, color y peso. Devuelve también las cajas para BORRARLAS del fondo, de modo que
    cada texto se separe de verdad (se puede mover/editar sin que quede el original debajo).

    El OCR corre sobre una versión en gris con contraste realzado (mismo tamaño que la
    imagen, así las cajas siguen mapeando 1:1 sobre el original) para no perder texto en
    fondos de color o de bajo contraste. `--oem 1 --psm 3`: motor LSTM + auto-layout."""
    gray = enhance_gray(bgr)
    data = pytesseract.image_to_data(
        gray,
        lang=settings.ocr_lang,
        config='--oem 1 --psm 3',
        output_type=pytesseract.Output.DICT,
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

    img_h, img_w = bgr.shape[:2]
    elements: list[TracedElement] = []
    boxes: list[tuple[int, int, int, int]] = []
    for g in groups.values():
        # Caja REAL del texto (para posición y tamaño exactos de la capa).
        rx0, ry0, rx1, ry1 = g["x0"], g["y0"], g["x1"], g["y1"]
        if rx1 <= rx0 or ry1 <= ry0:
            continue
        # Caja de BORRADO: la real + un margen, para tapar el texto (y su anti-aliasing)
        # en el fondo sin desplazar la posición reportada de la capa.
        pad = max(2, int((ry1 - ry0) * 0.18))
        ex0 = max(0, rx0 - pad)
        ey0 = max(0, ry0 - pad)
        ex1 = min(img_w, rx1 + pad)
        ey1 = min(img_h, ry1 + pad)

        crop = bgr[ry0:ry1, rx0:rx1]
        color = _dominant_pair_color(crop) if crop.size else "#111111"
        weight = _text_weight(crop, color)

        elements.append(
            TracedElement(
                kind="text",
                x=float(rx0),
                y=float(ry0),
                w=float(rx1 - rx0),  # ancho real → el cliente ajusta la fuente a este ancho
                h=float(ry1 - ry0),  # alto real de la línea de texto
                text=" ".join(g["words"]),
                font_size=float(int(np.median(g["heights"]))),
                color=color,
                overlay=False,  # capa visible y movible (el texto ya no vive en el fondo)
                font_weight=weight,
            )
        )
        boxes.append((ex0, ey0, ex1, ey1))
    return elements, boxes


def _erase_all_text(bgr: np.ndarray, boxes: list[tuple[int, int, int, int]]) -> np.ndarray:
    """Reconstruye el fondo BORRANDO todas las cajas de texto, para que los textos —ya
    convertidos en capas— se puedan mover sin dejar el original debajo. Borde uniforme →
    relleno plano con el color que rodea (impecable en fondos lisos); borde texturado →
    inpaint (mejor esfuerzo en fotos)."""
    if not boxes:
        return bgr
    out = bgr.copy()
    h, w = bgr.shape[:2]
    inpaint_mask = np.zeros((h, w), dtype=np.uint8)
    need_inpaint = False
    for x0, y0, x1, y1 in boxes:
        m = max(6, int((y1 - y0) * 0.5))
        rx0, ry0, rx1, ry1 = max(0, x0 - m), max(0, y0 - m), min(w, x1 + m), min(h, y1 + m)
        ring = np.concatenate(
            [
                out[ry0:y0, rx0:rx1].reshape(-1, 3),
                out[y1:ry1, rx0:rx1].reshape(-1, 3),
                out[y0:y1, rx0:x0].reshape(-1, 3),
                out[y0:y1, x1:rx1].reshape(-1, 3),
            ]
        )
        if len(ring) and ring.std(axis=0).mean() < 22:
            out[y0:y1, x0:x1] = np.median(ring, axis=0)
        else:
            inpaint_mask[y0:y1, x0:x1] = 255
            need_inpaint = True
    if need_inpaint:
        out = cv2.inpaint(out, inpaint_mask, 5, cv2.INPAINT_TELEA)
    return out


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


def _decompose(
    data: bytes, filename: str, on_progress: Callable[[float], None]
) -> tuple[TraceResult, bytes, np.ndarray]:
    """Descompone en CAPAS movibles: fondo con los textos borrados + cada texto como capa
    editable/movible encima (en su posición original)."""
    on_progress(10)
    bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("No se pudo leer la imagen (formato no soportado).")
    h, w = bgr.shape[:2]

    text_elements, boxes = _ocr_elements(bgr)
    on_progress(60)

    # Fondo = imagen con los textos borrados, así cada texto (ya capa) se mueve libre.
    clean = _erase_all_text(bgr, boxes)
    on_progress(80)

    background = _flat_background(clean)
    palette = _palette(clean)
    on_progress(90)

    clean_png = cv2.imencode(".png", clean)[1].tobytes()
    bg_element = TracedElement(
        kind="image", x=0, y=0, w=float(w), h=float(h), src=_png_dataurl(clean)
    )
    # z-order: fondo limpio (atrás) → textos como capas visibles y movibles (adelante).
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
    # Se persiste el fondo limpio; se devuelve el BGR ORIGINAL (con los textos aún visibles)
    # para que la detección de fuente por IA vea las tipografías. Vive fuera del thread
    # porque la auth de Vertex es async.
    return result, clean_png, bgr


def _persist(token: str, user_id: str, filename: str, bg_png: bytes) -> None:
    """Guarda la imagen base (original) como asset del usuario."""
    out_dir = Path(settings.download_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{Path(filename).stem or 'imagen'}-base"
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
    """Descompone la imagen en un hilo (OpenCV/Tesseract bloquean). Persiste la base si hay usuario."""
    result, bg_png, bgr = await asyncio.to_thread(_decompose, data, filename, report)
    # Enriquecimiento best-effort: familia tipográfica (Google Font) vía Gemini. Corre en
    # la corrutina porque access_token() es async; nunca rompe (ver detect_fonts).
    await detect_fonts(bgr, result.elements)
    if user_id and token:
        await asyncio.to_thread(_persist, token, user_id, filename, bg_png)
    return result.model_dump()
