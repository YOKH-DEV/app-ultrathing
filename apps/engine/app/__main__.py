"""Punto de entrada para el binario empaquetado (PyInstaller/sidecar de Tauri)."""
import uvicorn

from app.main import app


def main() -> None:
    uvicorn.run(app, host="127.0.0.1", port=8787)


if __name__ == "__main__":
    main()
