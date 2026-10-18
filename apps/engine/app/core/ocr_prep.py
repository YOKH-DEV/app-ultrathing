"""Preprocesamiento de imágenes para OCR (Tesseract).

Tesseract acierta mucho más con imágenes grandes, en escala de grises y con buen
contraste. Las fotos/diseños reales suelen venir chicos, con color y bajo contraste,
y ahí pierde texto o lo desordena. Estas funciones normalizan la entrada antes del OCR.
Comparten motor "Imagen a texto" (texto plano) e "Imagen → editable" (el tracer).
"""
import cv2
import numpy as np

# Tesseract trabaja mejor cuando el texto ronda los ~30px de alto. Escalamos la imagen
# para que su lado mayor llegue a este objetivo (sin achicar imágenes que ya son grandes).
_TARGET_LONG_SIDE = 1800


def enhance_gray(bgr: np.ndarray) -> np.ndarray:
    """Versión en gris con contraste realzado (CLAHE) y denoise suave. MISMA escala que
    la entrada — segura para el tracer, que mapea las cajas del OCR sobre la imagen
    original sin reescalar coordenadas."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    gray = cv2.fastNlMeansDenoising(gray, None, 7, 7, 21)
    return gray


def upscale_for_ocr(bgr: np.ndarray) -> np.ndarray:
    """Gris realzado y AMPLIADO para OCR de texto plano ("Imagen a texto"), donde no
    importan las coordenadas: agranda la imagen chica (interpolación cúbica) para que
    Tesseract lea el texto pequeño, luego aplica el mismo realce de contraste."""
    h, w = bgr.shape[:2]
    scale = max(1.0, _TARGET_LONG_SIDE / max(h, w))
    if scale > 1.0:
        bgr = cv2.resize(bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    return enhance_gray(bgr)
