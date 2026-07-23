"""Lógica del módulo video: elementos del diseño → mp4 animado con Remotion.

El render es pesado (Chromium headless), así que corre como job con progreso por SSE,
spawneando el CLI de Remotion sobre el proyecto `apps/video`. La composición 'Design'
recibe los MISMOS elementos que usa el lienzo (un solo contrato para canvas, IA y video).
Requiere Node instalado en la máquina del usuario.
"""
import asyncio
import json
import os
import re
import tempfile
from collections.abc import Callable
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.core.paths import unique_path
from app.core.supabase import insert_asset
from .schemas import VideoResult

# Remotion informa "Rendered 30/110" y luego "Encoded 30/110".
_PROGRESS = re.compile(r"(Rendered|Encoded)\s+(\d+)/(\d+)")


def _persist(token: str, user_id: str, result: VideoResult) -> None:
    insert_asset(token, user_id, "video", result.title, result.filepath, "video/mp4")


async def render(
    elements: list[dict[str, Any]],
    background: str,
    width: int,
    height: int,
    report: Callable[[float], None],
    user_id: str | None = None,
    token: str | None = None,
) -> dict[str, Any]:
    """Renderiza el diseño como mp4. Lanza ValueError si Remotion/Node falla."""
    project = Path(settings.video_project_dir)
    if not (project / "src" / "index.ts").exists():
        raise ValueError(f"No se encontró el proyecto de video en {project}.")

    out_dir = Path(settings.download_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = unique_path(out_dir, "video", "mp4")

    props = {
        "elements": elements,
        "background": background,
        "stagger": 10,
        "width": width,
        "height": height,
    }
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        json.dump(props, fh)
        props_path = fh.name

    report(5)
    try:
        proc = await asyncio.create_subprocess_exec(
            "npx",
            "remotion",
            "render",
            "src/index.ts",
            "Design",
            str(out_path),
            f"--props={props_path}",
            "--log=info",
            cwd=str(project),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        if proc.stdout is not None:
            async for raw in proc.stdout:
                match = _PROGRESS.search(raw.decode(errors="ignore"))
                if not match:
                    continue
                phase, done, total = match.group(1), int(match.group(2)), int(match.group(3))
                # Render ocupa el grueso del tiempo; el encode es el tramo final.
                base, span = (10.0, 60.0) if phase == "Rendered" else (70.0, 25.0)
                report(base + span * done / max(total, 1))
        code = await proc.wait()
    finally:
        os.unlink(props_path)

    if code != 0 or not out_path.exists():
        raise ValueError("Remotion no pudo renderizar el video (¿Node instalado?).")

    report(100)
    result = VideoResult(title=out_path.stem, filepath=str(out_path), ext="mp4")
    if user_id and token:
        await asyncio.to_thread(_persist, token, user_id, result)
    return result.model_dump()
