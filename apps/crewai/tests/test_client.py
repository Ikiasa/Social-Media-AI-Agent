import pytest
import httpx
from app.client import RionaApiClient, RionaApiClientError


@pytest.mark.asyncio
async def test_riona_api_client_build_headers():
    client = RionaApiClient(base_url="http://test-api:3001")
    headers = client._build_headers(
        request_id="req_123",
        workspace_id="ws-456",
        user_id="usr-789",
        role="admin",
    )
    assert headers["X-Request-ID"] == "req_123"
    assert headers["X-Workspace-ID"] == "ws-456"
    assert headers["X-User-ID"] == "usr-789"
    assert headers["X-User-Role"] == "admin"


@pytest.mark.asyncio
async def test_riona_api_client_missing_workspace_id():
    client = RionaApiClient(base_url="http://test-api:3001")
    with pytest.raises(RionaApiClientError, match="Workspace ID is required"):
        await client.post_event(
            endpoint="/api/v1/events",
            payload={"test": "data"},
            request_id="req_123",
            workspace_id="",
        )


@pytest.mark.asyncio
async def test_riona_api_client_timeout_handling(httpx_mock):
    httpx_mock.add_exception(httpx.TimeoutException("Connection timed out"))
    client = RionaApiClient(base_url="http://test-api:3001", timeout=1)

    with pytest.raises(RionaApiClientError) as exc_info:
        await client.get_health()
    assert exc_info.value.status_code == 504
    assert "timed out" in str(exc_info.value)


@pytest.mark.asyncio
async def test_riona_api_client_auth_failure(httpx_mock):
    httpx_mock.add_response(
        url="http://test-api:3001/api/v1/events",
        status_code=401,
        text="Unauthorized: Invalid Token",
    )
    client = RionaApiClient(base_url="http://test-api:3001")

    with pytest.raises(RionaApiClientError) as exc_info:
        await client.post_event(
            endpoint="/api/v1/events",
            payload={"test": "data"},
            request_id="req_123",
            workspace_id="ws-456",
        )
    assert exc_info.value.status_code == 401
    assert "Unauthorized" in str(exc_info.value)
