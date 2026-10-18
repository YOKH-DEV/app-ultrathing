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


# Estrategia por texto: agrupa por alineación de palabras cuando la tabla no tiene
# rayas. Es el respaldo para tablas sin bordes (que la detección por líneas no ve).
_TEXT_TABLE_SETTINGS = {"vertical_strategy": "text", "horizontal_strategy": "text"}
Table = list[list[str | None]]


def _normalize_tables(raw: object) -> list[Table]:
    """Descarta formas inválidas y normaliza celdas inesperadas sin asumir stubs externos."""
    if not isinstance(raw, list):
        return []
    tables: list[Table] = []
    for candidate in raw:
        if not isinstance(candidate, list):
            continue
        table: Table = []
        for candidate_row in candidate:
            if not isinstance(candidate_row, list):
                continue
            table.append(
                [cell if isinstance(cell, str) or cell is None else str(cell) for cell in candidate_row]
            )
        if table:
            tables.append(table)
    return tables


def _page_tables(page: Any) -> list[Table]:
    """Detecta tablas priorizando las líneas de borde (lo más preciso). Si la página
    no expone rayas que delimiten la tabla, reintenta con la estrategia por texto,
    así también captura tablas sin bordes en vez de darlas por inexistentes."""
    raw: object = page.extract_tables()
    if not raw:
        raw = page.extract_tables(_TEXT_TABLE_SETTINGS)
    return _normalize_tables(raw)


def _pdf_to_csv(data: bytes, filename: str, on_progress: Callable[[float], None]) -> PdfToCsvResult:
    rows: Table = []
    tables = 0
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        total = len(pdf.pages) or 1
        for i, page in enumerate(pdf.pages):
            for table in _page_tables(page):
                tables += 1
                rows.extend(table)
            on_progress(round((i + 1) / total * 90, 1))

    # La estrategia por texto suele intercalar filas vacías (los huecos verticales de
    # la tabla): se descartan para no ensuciar el CSV. Una fila es vacía si todas sus
    # celdas son None o quedan en blanco al recortar.
    rows = [row for row in rows if any((cell or "").strip() for cell in row)]

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
