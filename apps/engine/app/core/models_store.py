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
            data = json.load(f)
        if not isinstance(data, dict):
            return {"active_id": None, "models": []}
        data.setdefault("active_id", None)
        data.setdefault("models", [])
        return data
    except (FileNotFoundError, json.JSONDecodeError):
        return {"active_id": None, "models": []}


def _save(data: dict[str, Any]) -> None:
    os.makedirs(settings.download_dir, exist_ok=True)
    tmp = _path() + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, _path())


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
    for m in data.get("models", []):
        if m.get("id") == model_id:
            return m
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

    row: dict[str, Any] = {
        "id": mid,
        "name": (body.get("name") or "modelo").strip(),
        "kind": kind,
        "model": model_name,
        "base_url": (body.get("base_url") or "").strip() or None,
        "project": (body.get("project") or "").strip() or None,
        "location": (body.get("location") or "global").strip() or "global",
        "api_key": (existing or {}).get("api_key"),
        "credentials": (existing or {}).get("credentials"),
    }
    incoming_key = body.get("api_key")
    if isinstance(incoming_key, str) and incoming_key.strip() and not incoming_key.startswith("•"):
        row["api_key"] = incoming_key.strip()
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
    """Arma un modelo crudo para probar, rellenando keys previas si el form viene vacío."""
    mid = body.get("id")
    base = get_raw(str(mid)) if mid else None
    merged = dict(base or {})
    merged.update({k: v for k, v in body.items() if v not in (None, "", [])})
    if isinstance(body.get("api_key"), str) and body["api_key"].startswith("•"):
        merged["api_key"] = (base or {}).get("api_key")
    return merged
