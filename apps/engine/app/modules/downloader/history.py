"""Historial local de descargas, un archivo por usuario.

Antes era un `.history.json` global: cualquiera que abriera el motor veía las
descargas de todos. Ahora es `.history-<user_id>.json`. Sin user_id no hay
historial (la web exige sesión). Newest-first, tope 200.
"""
import json
import os
import re
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings

_MAX = 200
_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def _path(user_id: str) -> str:
    if not _UUID.match(user_id):
        raise ValueError("user_id de historial inválido")
    return os.path.join(settings.download_dir, f".history-{user_id}.json")


def read(user_id: str) -> list[dict[str, Any]]:
    try:
        with open(_path(user_id), encoding="utf-8") as f:
            data: list[dict[str, Any]] = json.load(f)
            return data
    except (FileNotFoundError, json.JSONDecodeError, ValueError):
        return []


def add(user_id: str, entry: dict[str, Any]) -> None:
    items = read(user_id)
    items.insert(0, {**entry, "at": datetime.now(timezone.utc).isoformat()})
    os.makedirs(settings.download_dir, exist_ok=True)
    with open(_path(user_id), "w", encoding="utf-8") as f:
        json.dump(items[:_MAX], f, ensure_ascii=False)


def clear(user_id: str) -> None:
    try:
        os.remove(_path(user_id))
    except OSError:
        pass
