"""CRUD local de modelos IA. Sin job system: request/response corto."""
from typing import Any

from fastapi import APIRouter, HTTPException

from app.core import models_store as store
from app.core.ai import test_model

router = APIRouter(prefix="/modules/models", tags=["models"])


@router.get("")
@router.get("/")
def list_models() -> dict[str, Any]:
    return store.list_state()


@router.post("")
def save_model(body: dict[str, Any]) -> dict[str, Any]:
    try:
        return store.upsert(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/test")
async def test(body: dict[str, Any]) -> dict[str, Any]:
    raw = store.merge_for_test(body)
    return await test_model(raw)


@router.post("/{model_id}/activate")
def activate(model_id: str) -> dict[str, str]:
    try:
        store.activate(model_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "ok"}


@router.delete("/{model_id}")
def delete_model(model_id: str) -> dict[str, str]:
    store.remove(model_id)
    return {"status": "ok"}
