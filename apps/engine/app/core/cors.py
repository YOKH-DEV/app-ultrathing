"""CORS estricto para clientes locales, Tauri y la web oficial."""

from starlette.datastructures import Headers
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response


ALLOWED_ORIGINS = [
    "https://app-ultrathing.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
    "http://localhost:1420",
    "tauri://localhost",
]


class PrivateNetworkCORSMiddleware(CORSMiddleware):
    """Habilita PNA solo cuando el preflight ya superó la allowlist de CORS."""

    def preflight_response(self, request_headers: Headers) -> Response:
        response = super().preflight_response(request_headers)
        origin = request_headers.get("origin", "")
        requests_private_network = (
            request_headers.get("access-control-request-private-network", "").lower() == "true"
        )
        if requests_private_network and self.is_allowed_origin(origin) and response.status_code < 400:
            response.headers["Access-Control-Allow-Private-Network"] = "true"
        elif requests_private_network and "Access-Control-Allow-Private-Network" in response.headers:
            del response.headers["Access-Control-Allow-Private-Network"]
        return response
