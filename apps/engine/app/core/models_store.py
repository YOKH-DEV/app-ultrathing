"""Registro local de modelos IA. Archivo: ~/Ultrathing/models.json (fuera del repo).

Cualquiera puede pegar una API OpenAI-compatible o un JSON de Vertex. Las keys
nunca salen de esta máquina. El modelo `active_id` es el que usa `ai.chat`.
"""
from __future__ import annotations

import json
import os
import uuid
from typing import Any

from app.core.config import settings

_MASK = "••••"


def _path() -> str:
    return os.path.join(settings.download_dir, "models.json")


def _load() -> dict[str, Any]:
    try:
        with open(_path(), encoding="utf-8") as f:
            raw: object = json.load(f)
        if not isinstance(raw, dict):
            return {"active_id": None, "models": []}
        active_id = raw.get("active_id")
        raw_models = raw.get("models")
        models: list[dict[str, Any]] = []
        if isinstance(raw_models, list):
            for candidate in raw_models:
                if isinstance(candidate, dict):
                    models.append(
                        {key: value for key, value in candidate.items() if isinstance(key, str)}
                    )
        return {
            "active_id": active_id if isinstance(active_id, str) else None,
            "models": models,
        }
    except (FileNotFoundError, json.JSONDecodeError):
        return {"active_id": None, "models": []}


def _save(data: dict[str, Any]) -> None:
    os.makedirs(settings.download_dir, exist_ok=True)
    tmp = _path() + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.chmod(tmp, 0o600)
    os.replace(tmp, _path())
    os.chmod(_path(), 0o600)


def _hint(key: str | None) -> str | None:
    if not key:
        return None
    tail = key[-4:] if len(key) >= 4 else key
    return f"{_MASK}{tail}"


def _public(m: dict[str, Any]) -> dict[str, Any]:
    kind = m.get("kind")
    out: dict[str, Any] = {
        "id": m.get("id"),
        "name": m.get("name"),
        "kind": kind,
        "model": m.get("model"),
        "base_url": m.get("base_url"),
        "project": m.get("project"),
        "location": m.get("location"),
        "has_key": bool(m.get("api_key")),
        "key_hint": _hint(m.get("api_key")),
        "has_credentials": bool(m.get("credentials")),
    }
    return out


def list_state() -> dict[str, Any]:
    data = _load()
    return {
        "active_id": data.get("active_id"),
        "models": [_public(m) for m in data.get("models", [])],
        "fallback": {
            "zai": bool(settings.zai_api_key),
            "vertex": bool(settings.vertex_credentials_path),
        },
    }


def get_raw(model_id: str) -> dict[str, Any] | None:
    data = _load()
    models = data.get("models")
    if not isinstance(models, list):
        return None
    for candidate in models:
        if not isinstance(candidate, dict) or candidate.get("id") != model_id:
            continue
        return {key: value for key, value in candidate.items() if isinstance(key, str)}
    return None


def active_raw() -> dict[str, Any] | None:
    data = _load()
    aid = data.get("active_id")
    if not aid:
        return None
    return get_raw(str(aid))


def upsert(body: dict[str, Any]) -> dict[str, Any]:
    data = _load()
    models: list[dict[str, Any]] = list(data.get("models") or [])
    mid = body.get("id") or str(uuid.uuid4())
    existing = next((m for m in models if m.get("id") == mid), None)
    kind = body.get("kind") or "openai"
    if kind not in ("openai", "vertex"):
        raise ValueError("kind debe ser openai o vertex")
    model_name = (body.get("model") or "").strip()
    if not model_name:
        raise ValueError("falta el nombre del modelo")

    new_url = (body.get("base_url") or "").strip() or None
    old_url = (existing or {}).get("base_url")
    host_changed = bool(
        existing
        and new_url
        and old_url
        and str(new_url).rstrip("/") != str(old_url).rstrip("/")
    )
    incoming_key = body.get("api_key")
    new_key = (
        incoming_key.strip()
        if isinstance(incoming_key, str)
        and incoming_key.strip()
        and not incoming_key.startswith("•")
        else None
    )
    if host_changed and not new_key:
        raise ValueError("cambiaste la URL: pegá de nuevo la API key")

    row: dict[str, Any] = {
        "id": mid,
        "name": (body.get("name") or "modelo").strip(),
        "kind": kind,
        "model": model_name,
        "base_url": new_url,
        "project": (body.get("project") or "").strip() or None,
        "location": (body.get("location") or "global").strip() or "global",
        "api_key": None if host_changed else (existing or {}).get("api_key"),
        "credentials": (existing or {}).get("credentials"),
    }
    if new_key:
        row["api_key"] = new_key
    creds = body.get("credentials")
    if isinstance(creds, dict) and creds:
        row["credentials"] = creds

    if existing:
        models = [row if m.get("id") == mid else m for m in models]
    else:
        models.append(row)
        if not data.get("active_id"):
            data["active_id"] = mid
    data["models"] = models
    _save(data)
    return _public(row)


def activate(model_id: str) -> None:
    if not get_raw(model_id):
        raise ValueError("modelo no encontrado")
    data = _load()
    data["active_id"] = model_id
    _save(data)


def remove(model_id: str) -> None:
    data = _load()
    data["models"] = [m for m in data.get("models", []) if m.get("id") != model_id]
    if data.get("active_id") == model_id:
        data["active_id"] = (data["models"][0]["id"] if data["models"] else None)
    _save(data)


def merge_for_test(body: dict[str, Any]) -> dict[str, Any]:
    """Arma un modelo crudo para probar, rellenando keys previas si el form viene vacío.

    Si cambia `base_url` respecto al guardado, NO reusa la key (evita mandarla a otro host).
    """
    mid = body.get("id")
    base = get_raw(str(mid)) if mid else None
    new_url = (body.get("base_url") or "").strip() or None
    old_url = (base or {}).get("base_url")
    host_changed = bool(
        base and new_url and old_url and str(new_url).rstrip("/") != str(old_url).rstrip("/")
    )
    merged = dict(base or {})
    merged.update({k: v for k, v in body.items() if v not in (None, "", [])})
    incoming = body.get("api_key")
    if host_changed:
        if not (isinstance(incoming, str) and incoming.strip() and not incoming.startswith("•")):
            raise ValueError("cambiaste la URL: pegá de nuevo la API key")
        merged["api_key"] = incoming.strip()
    elif isinstance(incoming, str) and incoming.startswith("•"):
        merged["api_key"] = (base or {}).get("api_key")
    return merged
