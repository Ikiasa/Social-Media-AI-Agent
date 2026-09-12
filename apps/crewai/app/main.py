import time
import uuid
from typing import Dict, Any, Optional
from fastapi import FastAPI, Header, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .logging import logger
from .health import get_liveness_status, get_readiness_status
from .runtime import CrewExecutionRequest, CrewExecutionResponse, runtime_instance

app = FastAPI(
    title="Riona CrewAI Microservice",
    version="1.0.0",
    description="Dedicated Dockerized CrewAI Intelligence Service for Riona Architecture",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Riona CrewAI Microservice...")
    try:
        settings.validate_production_readiness()
        logger.info(
            f"CrewAI Service started successfully in {settings.ENVIRONMENT} mode. "
            f"Target Riona API: {settings.RIONA_API_URL}"
        )
    except Exception as e:
        logger.error(f"Startup validation failed: {str(e)}")
        if settings.ENVIRONMENT.lower() == "production":
            raise RuntimeError(f"Startup halted due to production config failure: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Riona CrewAI Microservice gracefully...")


@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """
    Liveness probe endpoint.
    """
    return get_liveness_status()


@app.get("/readiness")
def readiness_check(response: Response):
    """
    Readiness probe endpoint.
    """
    res = get_readiness_status()
    if res["status"] != "READY":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return res


@app.post("/api/v1/crew/run", response_model=CrewExecutionResponse, status_code=status.HTTP_200_OK)
def run_crew(
    request_data: Dict[str, Any],
    x_request_id: Optional[str] = Header(None, alias="X-Request-ID"),
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-ID"),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    """
    Executes a CrewAI task or crew run within an authenticated workspace context.
    """
    request_id = x_request_id or f"req_{uuid.uuid4().hex[:12]}"
    workspace_id = x_workspace_id or request_data.get("workspace_id")

    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace context (X-Workspace-ID header or workspace_id field) is mandatory.",
        )

    topic_or_task = request_data.get("topic_or_task") or request_data.get("topic")
    if not topic_or_task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'topic_or_task' or 'topic' is required.",
        )

    crew_name = request_data.get("crew_name", "demo_crew")

    exec_req = CrewExecutionRequest(
        crew_name=crew_name,
        topic_or_task=topic_or_task,
        workspace_id=workspace_id,
        brand_id=request_data.get("brand_id"),
        user_id=x_user_id or request_data.get("user_id"),
        request_id=request_id,
        role=x_user_role or "user",
        params=request_data.get("params", {}),
    )

    try:
        result = runtime_instance.run(exec_req)
        logger.info(
            f"Crew '{crew_name}' executed successfully for workspace '{workspace_id}'.",
            extra={
                "requestId": request_id,
                "workspaceId": workspace_id,
                "crew": crew_name,
                "executionId": result.execution_id,
                "durationMs": result.duration_ms,
                "status": result.status,
            },
        )
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as err:
        logger.error(
            f"Error executing crew '{crew_name}': {str(err)}",
            extra={
                "requestId": request_id,
                "workspaceId": workspace_id,
                "crew": crew_name,
                "status": "FAILED",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Crew execution failed: {str(err)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.CREWAI_SERVICE_PORT)
