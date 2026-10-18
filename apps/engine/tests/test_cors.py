"""Regresión de CORS/PNA para el motor local."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.cors import ALLOWED_ORIGINS, PrivateNetworkCORSMiddleware


app = FastAPI()
app.add_middleware(
    PrivateNetworkCORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


client = TestClient(app)


def _pna_preflight(origin: str) -> dict[str, str]:
    return {
        "Origin": origin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
        "Access-Control-Request-Private-Network": "true",
    }


def test_web_oficial_puede_acceder_al_loopback_por_pna() -> None:
    origin = "https://app-ultrathing.vercel.app"

    response = client.options("/health", headers=_pna_preflight(origin))

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["access-control-allow-private-network"] == "true"


def test_origen_local_allowlisted_tambien_puede_usar_pna() -> None:
    origin = "http://localhost:1420"

    response = client.options("/health", headers=_pna_preflight(origin))

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["access-control-allow-private-network"] == "true"


def test_origen_malicioso_no_recibe_cors_ni_pna() -> None:
    response = client.options("/health", headers=_pna_preflight("https://evil.example"))

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
    assert "access-control-allow-private-network" not in response.headers
