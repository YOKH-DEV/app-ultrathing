"""Lógica pura de archivos: PDF tabular → CSV con pdfplumber + pandas."""
import asyncio
import io
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pandas as pd
import pdfplumber

from app.core.config import settings
from app.core.paths import unique_path
from app.core.supabase import insert_asset
from .schemas import PdfToCsvResult


def _pdf_to_csv(data: bytes, filename: str, on_progress: Callable[[float], None]) -> PdfToCsvResult:
    rows: list[list[Any]] = []
    tables = 0
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        total = len(pdf.pages) or 1
        for i, page in enumerate(pdf.pages):
            for table in page.extract_tables():
                tables += 1
                rows.extend(table)
            on_progress(round((i + 1) / total * 90, 1))

    if not rows:
        raise ValueError("El PDF no contiene tablas detectables.")

    # Normaliza el ancho: distintas tablas pueden traer distinto número de columnas.
    width = max(len(r) for r in rows)
    norm = [list(r) + [None] * (width - len(r)) for r in rows]
    df = pd.DataFrame(norm)

    out_dir = Path(settings.download_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = unique_path(out_dir, Path(filename).stem or "tabla", "csv")
    df.to_csv(out_path, index=False, header=False)

    on_progress(100)
    return PdfToCsvResult(
        title=out_path.stem,
        filepath=str(out_path),
        ext="csv",
        rows=len(rows),
        tables=tables,
    )


def _persist(token: str, user_id: str, result: PdfToCsvResult) -> None:
    insert_asset(token, user_id, "files", result.title, result.filepath, "text/csv")


async def pdf_to_csv(
    data: bytes,
    filename: str,
    report: Callable[[float], None],
    user_id: str | None = None,
    token: str | None = None,
) -> dict[str, Any]:
    """Extrae las tablas del PDF en un hilo (bloqueante). Persiste el asset si hay usuario."""
    result = await asyncio.to_thread(_pdf_to_csv, data, filename, report)
    if user_id and token:
        await asyncio.to_thread(_persist, token, user_id, result)
    return result.model_dump()
