"""Utilidades de rutas de salida compartidas por los módulos que producen archivos."""
from pathlib import Path


def unique_path(directory: Path, stem: str, ext: str) -> Path:
    """Devuelve una ruta libre en `directory`, agregando -1, -2… si el nombre ya existe."""
    candidate = directory / f"{stem}.{ext}"
    n = 1
    while candidate.exists():
        candidate = directory / f"{stem}-{n}.{ext}"
        n += 1
    return candidate
