"""Autodescubre los módulos en app/modules/*. Añadir un módulo NO requiere tocar main.py."""
import importlib
import pkgutil
from types import ModuleType

from fastapi import APIRouter

import app.modules as modules_pkg


def discover_routers() -> list[APIRouter]:
    routers: list[APIRouter] = []
    for info in pkgutil.iter_modules(modules_pkg.__path__):
        mod: ModuleType = importlib.import_module(f"app.modules.{info.name}.router")
        router = getattr(mod, "router", None)
        if isinstance(router, APIRouter):
            routers.append(router)
    return routers
