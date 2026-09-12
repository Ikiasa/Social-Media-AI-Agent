import time
import uuid
from typing import Dict, Any, Optional, Callable
from pydantic import BaseModel, Field


class CrewExecutionRequest(BaseModel):
    crew_name: str = Field(..., description="Registered crew identifier")
    topic_or_task: str = Field(..., description="Target input, topic keyword, or URL")
    workspace_id: str = Field(..., description="Authenticated workspace context")
    brand_id: Optional[str] = Field(None, description="Optional brand context")
    user_id: Optional[str] = Field(None, description="Authenticated user ID")
    request_id: Optional[str] = Field(None, description="Correlation request ID")
    role: Optional[str] = Field("user", description="Authenticated user role")
    params: Optional[Dict[str, Any]] = Field(default_factory=dict)


class CrewExecutionResponse(BaseModel):
    execution_id: str
    crew_name: str
    status: str
    workspace_id: str
    request_id: str
    duration_ms: int
    output: Dict[str, Any]


class BaseCrewHandler:
    def execute(self, request: CrewExecutionRequest) -> Dict[str, Any]:
        raise NotImplementedError


class DemoCrewHandler(BaseCrewHandler):
    """
    Minimal demonstration crew handler providing deterministic output for unit tests.
    Does not depend on external live LLM calls.
    """

    def execute(self, request: CrewExecutionRequest) -> Dict[str, Any]:
        return {
            "crew": "demo_crew",
            "agent": "DemoScraperAnalyst",
            "processed_topic": request.topic_or_task,
            "workspace_id": request.workspace_id,
            "summary": f"Deterministic execution output for topic '{request.topic_or_task}'",
            "status": "COMPLETED",
        }


class CrewRegistry:
    """
    Registry for managing available CrewAI specialist handlers.
    """

    def __init__(self):
        self._registry: Dict[str, BaseCrewHandler] = {}
        # Register default demo crew handler
        self.register("demo_crew", DemoCrewHandler())

    def register(self, crew_name: str, handler: BaseCrewHandler) -> None:
        self._registry[crew_name] = handler

    def get(self, crew_name: str) -> Optional[BaseCrewHandler]:
        return self._registry.get(crew_name)

    def list_crews(self) -> list[str]:
        return list(self._registry.keys())


class CrewRuntime:
    """
    Runtime engine for orchestrating CrewAI execution requests.
    Enforces authorization context, request ID tracking, and execution metrics.
    """

    def __init__(self, registry: Optional[CrewRegistry] = None):
        self.registry = registry or CrewRegistry()

    def run(self, request: CrewExecutionRequest) -> CrewExecutionResponse:
        if not request.workspace_id:
            raise ValueError("Workspace context (workspace_id) is mandatory for CrewRuntime execution.")

        handler = self.registry.get(request.crew_name)
        if not handler:
            raise ValueError(f"Crew '{request.crew_name}' is not registered in CrewRegistry.")

        execution_id = f"exec_{uuid.uuid4().hex[:12]}"
        request_id = request.request_id or f"req_{uuid.uuid4().hex[:12]}"

        start_time = time.time()
        output_data = handler.execute(request)
        duration_ms = int((time.time() - start_time) * 1000)

        return CrewExecutionResponse(
            execution_id=execution_id,
            crew_name=request.crew_name,
            status="COMPLETED",
            workspace_id=request.workspace_id,
            request_id=request_id,
            duration_ms=duration_ms,
            output=output_data,
        )


runtime_instance = CrewRuntime()
