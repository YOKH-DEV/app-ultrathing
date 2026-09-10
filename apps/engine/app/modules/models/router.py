"""CRUD local de modelos IA. Sin job system: request/response corto.

Las keys viven en esta máquina, pero el sidecar escucha en localhost: hay que
exigir sesión igual — si no, cualquiera en la LAN redirige la key a otro host.
"""
from typing import Any

from fastapi import APIRouter, Header, HTTPException

from app.core import models_store as store
from app.core.ai import test_model
from app.core.supabase import user_id_from_token

router = APIRouter(prefix="/modules/models", tags=["models"])


def _require_user(authorization: str | None) -> str:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    if not token:
        raise HTTPException(status_code=401, detail="necesitás entrar para manejar modelos")
    try:
        return user_id_from_token(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="sesión inválida") from exc


@router.get("")
@router.get("/")
def list_models(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    _require_user(authorization)
    return store.list_state()


@router.post("")
def save_model(
    body: dict[str, Any], authorization: str | None = Header(default=None)
) -> dict[str, Any]:
    _require_user(authorization)
    try:
        return store.upsert(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/test")
async def test(
    body: dict[str, Any], authorization: str | None = Header(default=None)
) -> dict[str, Any]:
    _require_user(authorization)
    try:
        raw = store.merge_for_test(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await test_model(raw)


@router.post("/{model_id}/activate")
def activate(model_id: str, authorization: str | None = Header(default=None)) -> dict[str, str]:
    _require_user(authorization)
    try:
        store.activate(model_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "ok"}


@router.delete("/{model_id}")
def delete_model(model_id: str, authorization: str | None = Header(default=None)) -> dict[str, str]:
    _require_user(authorization)
    store.remove(model_id)
    return {"status": "ok"}
