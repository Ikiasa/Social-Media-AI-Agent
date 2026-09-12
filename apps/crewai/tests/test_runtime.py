import pytest
from app.runtime import (
    CrewRuntime,
    CrewRegistry,
    CrewExecutionRequest,
    BaseCrewHandler,
)


class CustomTestCrewHandler(BaseCrewHandler):
    def execute(self, request: CrewExecutionRequest):
        return {
            "crew": "custom_test",
            "topic": request.topic_or_task,
            "workspace_id": request.workspace_id,
            "custom_result": "SUCCESS",
        }


def test_crew_registry_registration():
    registry = CrewRegistry()
    assert "demo_crew" in registry.list_crews()

    custom_handler = CustomTestCrewHandler()
    registry.register("custom_test", custom_handler)

    assert "custom_test" in registry.list_crews()
    assert registry.get("custom_test") == custom_handler


def test_crew_runtime_deterministic_execution():
    runtime = CrewRuntime()
    req = CrewExecutionRequest(
        crew_name="demo_crew",
        topic_or_task="Pilkada 2026",
        workspace_id="ws-test-100",
        request_id="req-test-100",
    )

    res = runtime.run(req)
    assert res.status == "COMPLETED"
    assert res.crew_name == "demo_crew"
    assert res.workspace_id == "ws-test-100"
    assert res.request_id == "req-test-100"
    assert res.output["processed_topic"] == "Pilkada 2026"
    assert res.duration_ms >= 0


def test_crew_runtime_unregistered_crew_fails():
    runtime = CrewRuntime()
    req = CrewExecutionRequest(
        crew_name="unknown_crew",
        topic_or_task="Test",
        workspace_id="ws-test-100",
    )
    with pytest.raises(ValueError, match="is not registered"):
        runtime.run(req)


def test_crew_runtime_missing_workspace_id_fails():
    runtime = CrewRuntime()
    req = CrewExecutionRequest(
        crew_name="demo_crew",
        topic_or_task="Test",
        workspace_id="",
    )
    with pytest.raises(ValueError, match="Workspace context.*is mandatory"):
        runtime.run(req)
