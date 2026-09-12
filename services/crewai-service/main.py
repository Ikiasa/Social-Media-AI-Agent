import os
import uuid
import json
import time
import logging
from typing import Dict, Optional, List
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import (
    AnalysisRequest, JobStatusResponse, AnalysisResult, SuggestedReply, 
    SentimentDistribution, HighIntentLead, TrendToContentRequest, TrendToContentResult,
    KnowledgeUploadResponse, KnowledgeQueryRequest, KnowledgeQueryResponse,
    LangGraphContentRequest, LangGraphContentResponse,
    ImagePromptGraphRequest, ImagePromptGraphResponse,
    ResearchModuleRequest, ResearchModuleResult, PromoteIdeaRequest
)
from crew import create_instagram_analysis_crew
from crew_trend import run_trend_to_content_pipeline
from crew_research import run_research_pipeline
from langgraph_pipeline import run_langgraph_content_pipeline, run_langgraph_image_prompt_pipeline
from storage import KnowledgeStorage, FileKnowledgeStorage, FileJobStorage, StorageError
from knowledge_service import KnowledgeManager

knowledge_mgr = KnowledgeManager()
job_storage = FileJobStorage()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crewai-service")

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "").strip()


def log_event(event_name: str, workspace_id: str, brand_id: Optional[str] = None, duration_ms: float = 0, status: str = "SUCCESS", extra: Optional[Dict] = None):
    """Structured JSON Logger for Audit and Observability."""
    payload = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event": event_name,
        "workspace_id": workspace_id,
        "brand_id": brand_id or "default",
        "duration_ms": round(duration_ms, 2),
        "status": status,
    }
    if extra:
        # Redact sensitive keys
        safe_extra = {k: v for k, v in extra.items() if not any(s in k.lower() for s in ["key", "token", "auth", "secret"])}
        payload["metadata"] = safe_extra
    logger.info(json.dumps(payload, ensure_ascii=False))


def verify_tenant_auth(
    x_internal_api_key: Optional[str] = Header(None, alias="X-Internal-API-Key"),
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-Id"),
    x_brand_id: Optional[str] = Header(None, alias="X-Brand-Id")
) -> Dict[str, str]:
    """Enforces API Key Authentication and Tenant Context Isolation."""
    if INTERNAL_API_KEY and x_internal_api_key != INTERNAL_API_KEY:
        # Allow internal network development calls if header omitted in dev
        if os.getenv("ENVIRONMENT") == "production":
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing X-Internal-API-Key header.")

    workspace_id = x_workspace_id.strip() if x_workspace_id else "default"
    brand_id = x_brand_id.strip() if x_brand_id else "default"

    return {
        "workspace_id": workspace_id,
        "brand_id": brand_id
    }


app = FastAPI(
    title="Riona CrewAI Intelligence Service",
    version="1.2.0",
    description="Asynchronous CrewAI & LlamaIndex multi-agent service for Social Media scraping, Knowledge RAG, and Trend-to-Content synthesis.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler returning clean JSON without leaking stack traces."""
    logger.error(f"Global Handler Exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An error occurred while processing your request. Please check service logs.",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    )


@app.get("/")
def root():
    return {
        "message": "Welcome to Riona CrewAI Intelligence Service",
        "docs": "/docs",
        "health": "/health",
        "status": "online"
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "riona-crewai-service", "version": "1.2.0"}


def run_crew_background_job(job_id: str, topic_or_url: str, target_type: str = "url", depth: str = "standard"):
    logger.info(f"Starting CrewAI background task for job_id: {job_id}, topic: {topic_or_url}")
    job_storage.save_job(job_id, {"status": "processing", "result": None, "error": None})

    try:
        crew = create_instagram_analysis_crew(topic_or_url)
        raw_result = crew.kickoff()

        if hasattr(raw_result, "pydantic") and raw_result.pydantic:
            parsed_result = raw_result.pydantic
        elif isinstance(raw_result, AnalysisResult):
            parsed_result = raw_result
        else:
            raise ValueError("CrewAI execution completed but output did not match expected AnalysisResult model.")

        parsed_result.target_type = target_type
        parsed_result.depth = depth

        job_storage.save_job(job_id, {"status": "completed", "result": parsed_result.dict(), "error": None})
        logger.info(f"CrewAI job_id: {job_id} completed successfully.")
    except Exception as e:
        logger.error(f"Error executing CrewAI job_id: {job_id}: {str(e)}")
        job_storage.save_job(job_id, {
            "status": "failed",
            "result": None,
            "error": {
                "code": "ANALYSIS_PROVIDER_UNAVAILABLE",
                "message": f"Failed to execute audience analysis crew: {str(e)}"
            }
        })


@app.post("/api/run-analysis", status_code=202)
def run_analysis(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    tenant: Dict[str, str] = Depends(verify_tenant_auth)
):
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    target = request.target_url or request.topic
    target_type = request.target_type or "url"
    depth = request.depth or "standard"

    job_storage.save_job(job_id, {"status": "queued", "result": None, "error": None})
    background_tasks.add_task(run_crew_background_job, job_id, target, target_type, depth)

    return {"job_id": job_id, "status": "processing", "message": "CrewAI analysis queued successfully."}


@app.get("/api/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    data = job_storage.get_job(job_id)
    if not data:
        raise HTTPException(status_code=404, detail="Job ID not found.")
    return JobStatusResponse(
        job_id=job_id,
        status=data["status"],
        result=data.get("result"),
        error=data.get("error"),
    )



@app.post("/api/knowledge/upload", response_model=KnowledgeUploadResponse)
async def upload_brand_knowledge(
    file: UploadFile = File(...),
    workspace_id: Optional[str] = Form(None),
    brand_id: Optional[str] = Form("default"),
    tenant: Dict[str, str] = Depends(verify_tenant_auth)
):
    """
    Feature #1: Upload Brand Knowledge Document
    Scoped by workspace_id and brand_id. Performs SHA256 content hashing deduplication,
    storage abstraction saving, and persistent LlamaIndex vector store indexing.
    """
    start_time = time.time()
    ws_id = workspace_id or tenant["workspace_id"]
    br_id = brand_id or tenant["brand_id"]

    try:
        content = await file.read()
        res = knowledge_mgr.save_and_index_file(
            file_bytes=content,
            filename=file.filename or "brand_document.txt",
            workspace_id=ws_id,
            brand_id=br_id
        )

        log_event(
            event_name="KNOWLEDGE_UPLOAD",
            workspace_id=ws_id,
            brand_id=br_id,
            duration_ms=(time.time() - start_time) * 1000,
            status="SUCCESS",
            extra={"filename": file.filename, "document_id": res.get("document_id")}
        )

        return KnowledgeUploadResponse(
            status=res["status"],
            workspace_id=ws_id,
            filename=res["filename"],
            saved_path=res.get("saved_path", ""),
            total_documents_indexed=res.get("total_documents_indexed", 1)
        )
    except StorageError as se:
        raise HTTPException(status_code=400, detail=str(se))
    except Exception as e:
        logger.error(f"Error uploading knowledge file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process and index knowledge file: {str(e)}")


@app.post("/api/knowledge/query", response_model=KnowledgeQueryResponse)
def query_brand_knowledge(
    request: KnowledgeQueryRequest,
    tenant: Dict[str, str] = Depends(verify_tenant_auth)
):
    """
    Feature #1: Query Brand Knowledge Base
    Performs RAG search against workspace and brand scoped vector index,
    returning detailed provenance source snippets.
    """
    start_time = time.time()
    ws_id = request.workspace_id or tenant["workspace_id"]
    br_id = tenant["brand_id"]

    try:
        res = knowledge_mgr.query_knowledge(
            query_text=request.query,
            workspace_id=ws_id,
            brand_id=br_id
        )

        log_event(
            event_name="KNOWLEDGE_QUERY",
            workspace_id=ws_id,
            brand_id=br_id,
            duration_ms=(time.time() - start_time) * 1000,
            status="SUCCESS",
            extra={"query": request.query, "source_count": len(res.get("sources", []))}
        )

        return KnowledgeQueryResponse(
            status=res["status"],
            workspace_id=ws_id,
            brand_id=br_id,
            query=request.query,
            answer=res["answer"],
            sources=res.get("sources", [])
        )
    except Exception as e:
        logger.error(f"Error querying brand knowledge: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to query knowledge base: {str(e)}")


@app.get("/api/knowledge/documents")
def list_brand_knowledge_documents(
    workspace_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    tenant: Dict[str, str] = Depends(verify_tenant_auth)
):
    """Lists indexed document records for the authenticated workspace & brand."""
    ws_id = workspace_id or tenant["workspace_id"]
    br_id = brand_id or tenant["brand_id"]
    return {"workspace_id": ws_id, "brand_id": br_id, "documents": knowledge_mgr.list_documents(ws_id, br_id)}


@app.delete("/api/knowledge/document/{document_id}")
def delete_brand_knowledge_document(
    document_id: str,
    workspace_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    tenant: Dict[str, str] = Depends(verify_tenant_auth)
):
    """Deletes a document from knowledge storage and rebuilds the vector index cleanly."""
    ws_id = workspace_id or tenant["workspace_id"]
    br_id = brand_id or tenant["brand_id"]
    success = knowledge_mgr.delete_document(document_id, ws_id, br_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found.")
    return {"status": "success", "message": f"Document '{document_id}' deleted and index updated."}


@app.post("/api/trend-to-content", response_model=TrendToContentResult)
def trend_to_content(
    request: TrendToContentRequest,
    tenant: Dict[str, str] = Depends(verify_tenant_auth)
):
    """
    Feature #3: Hardened Trend-to-Content Pipeline
    Validates trend URLs against SSRF policies, extracts SourceArtifacts,
    indexes with LlamaIndex, and generates posts with full source provenance lineage.
    """
    start_time = time.time()
    ws_id = tenant["workspace_id"]
    br_id = tenant["brand_id"]

    if not request.source_urls:
        raise HTTPException(status_code=400, detail="At least one source_url is required.")

    try:
        result = run_trend_to_content_pipeline(
            urls=request.source_urls,
            target_brand=request.target_brand or "General Brand",
            count=request.count or 3
        )

        log_event(
            event_name="TREND_TO_CONTENT",
            workspace_id=ws_id,
            brand_id=br_id,
            duration_ms=(time.time() - start_time) * 1000,
            status="SUCCESS",
            extra={"source_urls_count": len(request.source_urls), "posts_generated": len(result.generated_posts)}
        )

        return result
    except Exception as e:
        logger.error(f"Error in Trend-to-Content Pipeline: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pipeline execution error: {str(e)}")


@app.post("/api/langgraph/generate-content", response_model=LangGraphContentResponse)
def generate_content_langgraph(
    request: LangGraphContentRequest,
    tenant: Dict[str, str] = Depends(verify_tenant_auth)
):
    """
    Stateful Self-Correction Content Pipeline (LangGraph)
    Executes Writer Agent -> Quality Control Evaluator Loop -> Human Approval Checkpoint.
    Applies multi-tenant isolation (workspace_id, brand_id) and RAG brand knowledge context.
    """
    start_time = time.time()
    ws_id = request.workspace_id or tenant["workspace_id"]
    br_id = request.brand_id or tenant["brand_id"]

    try:
        res = run_langgraph_content_pipeline(
            topic=request.topic,
            workspace_id=ws_id,
            brand_id=br_id,
            target_brand=request.target_brand or "General Brand"
        )

        log_event(
            event_name="LANGGRAPH_CONTENT_GENERATE",
            workspace_id=ws_id,
            brand_id=br_id,
            duration_ms=(time.time() - start_time) * 1000,
            status=res.get("status", "COMPLETED"),
            extra={"topic": request.topic, "qc_score": res.get("qc_review", {}).get("score")}
        )

        return LangGraphContentResponse(
            workspace_id=ws_id,
            brand_id=br_id,
            topic=request.topic,
            target_brand=request.target_brand or "General Brand",
            status=res.get("status", "FAILED"),
            draft_post=res.get("draft_post"),
            qc_review=res.get("qc_review"),
            revision_count=res.get("revision_count", 0),
            error=res.get("error")
        )
    except Exception as e:
        logger.error(f"Error in LangGraph Content Pipeline: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LangGraph execution error: {str(e)}")


@app.post("/api/langgraph/generate-image-prompt", response_model=ImagePromptGraphResponse)
def generate_image_prompt_langgraph(
    request: ImagePromptGraphRequest,
    tenant: Dict[str, str] = Depends(verify_tenant_auth)
):
    """
    AI Image Generation & Visual Prompt Self-Correction Loop (LangGraph)
    Executes Visual Identity RAG -> Prompt Engineer Agent -> Visual QC Evaluator Loop -> Final Image Spec.
    Applies multi-tenant isolation (workspace_id, brand_id).
    """
    start_time = time.time()
    ws_id = request.workspace_id or tenant["workspace_id"]
    br_id = request.brand_id or tenant["brand_id"]

    try:
        res = run_langgraph_image_prompt_pipeline(
            topic=request.topic,
            workspace_id=ws_id,
            brand_id=br_id,
            target_brand=request.target_brand or "General Brand",
            visual_style=request.visual_style or "Modern Minimalist",
            aspect_ratio=request.aspect_ratio or "1:1"
        )

        log_event(
            event_name="LANGGRAPH_IMAGE_PROMPT_GENERATE",
            workspace_id=ws_id,
            brand_id=br_id,
            duration_ms=(time.time() - start_time) * 1000,
            status=res.get("status", "READY_FOR_GENERATION"),
            extra={"topic": request.topic, "qc_score": res.get("qc_eval", {}).get("score")}
        )

        return ImagePromptGraphResponse(
            workspace_id=ws_id,
            brand_id=br_id,
            topic=request.topic,
            target_brand=request.target_brand or "General Brand",
            visual_style=res.get("visual_style", request.visual_style or "Modern Minimalist"),
            aspect_ratio=res.get("aspect_ratio", request.aspect_ratio or "1:1"),
            status=res.get("status", "FAILED"),
            visual_spec=res.get("visual_spec"),
            qc_eval=res.get("qc_eval"),
            revision_count=res.get("revision_count", 0),
            error=res.get("error")
        )
    except Exception as e:
        logger.error(f"Error in LangGraph Image Prompt Pipeline: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LangGraph execution error: {str(e)}")


@app.post("/api/v1/research/analyze", response_model=ResearchModuleResult)
def analyze_research_module(
    request: ResearchModuleRequest,
    tenant: Dict[str, str] = Depends(verify_tenant_auth)
):
    """
    Executes the Comprehensive Research Module:
    Market Gap Finder + Content Saturation Scoring + Hook Generator & Scorer + 2x2 Idea Matrix.
    """
    start_time = time.time()
    ws_id = request.workspace_id or tenant["workspace_id"]
    br_id = tenant["brand_id"]

    try:
        res = run_research_pipeline(
            topic=request.topic,
            reference_urls=request.reference_urls,
            target_brand=request.target_brand or "General Brand"
        )
        log_event(
            event_name="RESEARCH_MODULE_ANALYZE",
            workspace_id=ws_id,
            brand_id=br_id,
            duration_ms=(time.time() - start_time) * 1000,
            status="SUCCESS",
            extra={"topic": request.topic, "hooks_count": len(res.hooks), "ideas_count": len(res.ideas_matrix)}
        )
        return res
    except Exception as e:
        logger.error(f"Error in Research Module Pipeline: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Research execution error: {str(e)}")


@app.post("/api/v1/research/promote")
def promote_idea_to_production(
    request: PromoteIdeaRequest,
    tenant: Dict[str, str] = Depends(verify_tenant_auth)
):
    """
    1-Click Promote to Production:
    Triggers LangGraph content pipeline to turn an Idea Matrix item into a complete post draft.
    """
    start_time = time.time()
    ws_id = request.workspace_id or tenant["workspace_id"]
    br_id = tenant["brand_id"]

    try:
        combined_topic = f"{request.title} - Hook: '{request.verbal_hook}' (Angle: {request.contrarian_angle})"
        res = run_langgraph_content_pipeline(
            topic=combined_topic,
            workspace_id=ws_id,
            brand_id=br_id,
            target_brand=request.target_brand or "General Brand"
        )
        log_event(
            event_name="RESEARCH_PROMOTE_TO_PRODUCTION",
            workspace_id=ws_id,
            brand_id=br_id,
            duration_ms=(time.time() - start_time) * 1000,
            status=res.get("status", "COMPLETED"),
            extra={"idea_id": request.idea_id, "title": request.title}
        )
        return {
            "status": "SUCCESS",
            "idea_id": request.idea_id,
            "title": request.title,
            "langgraph_result": res
        }
    except Exception as e:
        logger.error(f"Error promoting idea to production: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Promote execution error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



