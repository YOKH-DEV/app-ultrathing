"""Historial local de descargas. Se guarda en un JSON dentro de la carpeta de
descargas, así funciona sin login (independiente de Supabase). Newest-first, tope 200.
"""
import json
import os
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings

_MAX = 200


def _path() -> str:
    return os.path.join(settings.download_dir, ".history.json")


def read() -> list[dict[str, Any]]:
    try:
        with open(_path(), encoding="utf-8") as f:
            data: list[dict[str, Any]] = json.load(f)
            return data
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def add(entry: dict[str, Any]) -> None:
    items = read()
    items.insert(0, {**entry, "at": datetime.now(timezone.utc).isoformat()})
    os.makedirs(settings.download_dir, exist_ok=True)
    with open(_path(), "w", encoding="utf-8") as f:
        json.dump(items[:_MAX], f, ensure_ascii=False)


def clear() -> None:
    try:
        os.remove(_path())
    except OSError:
        pass
