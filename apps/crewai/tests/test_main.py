from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["service"] == "riona-crewai"


def test_readiness_endpoint():
    response = client.get("/readiness")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "READY"


def test_run_crew_endpoint_success():
    payload = {
        "crew_name": "demo_crew",
        "topic": "Isu Kebijakan Publik",
        "workspace_id": "ws-test-main",
    }
    headers = {
        "X-Request-ID": "req-main-1",
        "X-Workspace-ID": "ws-test-main",
        "X-User-ID": "user-main-1",
        "X-User-Role": "admin",
    }
    response = client.post("/api/v1/crew/run", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["workspace_id"] == "ws-test-main"
    assert data["request_id"] == "req-main-1"
    assert data["output"]["processed_topic"] == "Isu Kebijakan Publik"


def test_run_crew_endpoint_missing_workspace():
    payload = {
        "crew_name": "demo_crew",
        "topic": "Test Topic",
    }
    response = client.post("/api/v1/crew/run", json=payload)
    assert response.status_code == 400
    assert "Workspace context" in response.json()["detail"]
