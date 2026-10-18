"""Smoke test: el motor monta y responde. Si esto falla, nada más importa."""
from fastapi.testclient import TestClient

from app.main import app


def test_health_responde_ok() -> None:
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
