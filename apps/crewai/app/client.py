import httpx
from typing import Dict, Any, Optional
from .config import settings
from .logging import logger


class RionaApiClientError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[Any] = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details


class RionaApiClient:
    """
    Controlled HTTP client abstraction for CrewAI service interaction with Riona API.
    Enforces authorization headers, request correlation IDs, and workspace context.
    """

    def __init__(self, base_url: Optional[str] = None, timeout: Optional[int] = None):
        self.base_url = (base_url or settings.RIONA_API_URL).rstrip("/")
        self.timeout = timeout or settings.REQUEST_TIMEOUT_SECONDS

    def _build_headers(
        self,
        request_id: str,
        workspace_id: str,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
    ) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "X-Request-ID": request_id,
            "X-Workspace-ID": workspace_id,
        }
        if user_id:
            headers["X-User-ID"] = user_id
        if role:
            headers["X-User-Role"] = role
        if settings.INTERNAL_API_KEY:
            headers["Authorization"] = f"Bearer {settings.INTERNAL_API_KEY}"
        return headers

    async def get_health(self) -> Dict[str, Any]:
        """
        Queries the internal Riona API health endpoint.
        """
        url = f"{self.base_url}/health"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                if response.status_code != 200:
                    raise RionaApiClientError(
                        f"Riona API health check failed with status {response.status_code}",
                        status_code=response.status_code,
                    )
                return response.json()
            except httpx.TimeoutException:
                raise RionaApiClientError("Riona API request timed out", status_code=504)
            except httpx.RequestError as exc:
                raise RionaApiClientError(f"Riona API connection error: {str(exc)}", status_code=503)

    async def post_event(
        self,
        endpoint: str,
        payload: Dict[str, Any],
        request_id: str,
        workspace_id: str,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends an authenticated event or command to the Riona API.
        """
        if not workspace_id:
            raise RionaApiClientError("Workspace ID is required for API requests", status_code=400)

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self._build_headers(request_id, workspace_id, user_id, role)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code >= 400:
                    raise RionaApiClientError(
                        f"Riona API error response: {response.text}",
                        status_code=response.status_code,
                        details=response.text,
                    )
                return response.json()
            except httpx.TimeoutException:
                raise RionaApiClientError("Riona API request timed out", status_code=504)
            except httpx.RequestError as exc:
                raise RionaApiClientError(f"Riona API request failed: {str(exc)}", status_code=503)
