import os
import json
from typing import TypedDict, Optional, List, Dict, Any
from dotenv import load_dotenv

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from knowledge_service import KnowledgeManager

load_dotenv(override=True)
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""

km = KnowledgeManager()


class ContentGraphState(TypedDict, total=False):
    workspace_id: str
    brand_id: str
    topic: str
    target_brand: str
    brand_knowledge: str
    draft_post: Optional[Dict[str, Any]]
    qc_review: Optional[Dict[str, Any]]
    revision_count: int
    status: str
    error: Optional[str]


def node_retrieve_knowledge(state: ContentGraphState) -> Dict[str, Any]:
    """Node 1: Retrieves brand knowledge RAG context for tenant scope."""
    ws_id = state.get("workspace_id", "default")
    br_id = state.get("brand_id", "default")
    topic = state.get("topic", "")

    try:
        rag_res = km.query_knowledge(query_text=topic, workspace_id=ws_id, brand_id=br_id)
        knowledge_text = rag_res.get("answer", "No specific brand knowledge retrieved.")
        return {"brand_knowledge": knowledge_text, "status": "DRAFTING"}
    except Exception as err:
        return {"brand_knowledge": f"Knowledge query error: {err}", "status": "DRAFTING"}


def node_write_content(state: ContentGraphState) -> Dict[str, Any]:
    """Node 2: Writer Agent drafts/revises social media post assets."""
    if not api_key:
        return {
            "status": "FAILED",
            "error": "GEMINI_API_KEY is missing or invalid. Cannot execute LangGraph Writer Agent."
        }

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key, temperature=0.3)
    
    topic = state.get("topic", "")
    target_brand = state.get("target_brand", "General Brand")
    brand_knowledge = state.get("brand_knowledge", "")
    qc_review = state.get("qc_review")
    revision_count = state.get("revision_count", 0)

    revision_instructions = ""
    if qc_review and not qc_review.get("is_approved"):
        feedback = qc_review.get("feedback", "")
        improvements = ", ".join(qc_review.get("improvements", []))
        revision_instructions = (
            f"\n\n[REVISION NOTICE - ATTEMPT {revision_count + 1}]:\n"
            f"Your previous draft scored {qc_review.get('score', 0)}/10 and was REJECTED by QC.\n"
            f"QC Feedback: {feedback}\n"
            f"Actionable Fixes Required: {improvements}\n"
            "You MUST address every piece of feedback in this new draft."
        )

    system_prompt = (
        "You are an elite Brand Social Media Copywriter AI.\n"
        "Generate a structured social media post tailored for the target brand.\n"
        "Return ONLY a valid raw JSON object (no markdown, no ```json wrapper) with keys:\n"
        "- headline_hook: Catchy scroll-stopping headline\n"
        "- core_takeaway: Key takeaway message\n"
        "- content_format: e.g. 'Carousel 5-Pages', 'Reel Script', 'Infographic'\n"
        "- caption: Full engaging caption with emojis & call-to-action\n"
        "- hashtags: Array of 5 relevant hashtags\n"
        "- image_prompt: Detailed prompt for AI Image Generation (DALL-E 3/Midjourney)\n"
    )

    user_prompt = (
        f"Target Brand: {target_brand}\n"
        f"Topic: {topic}\n\n"
        f"Retrieved Brand Knowledge:\n{brand_knowledge}"
        f"{revision_instructions}"
    )

    try:
        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        raw_text = response.content.strip()
        
        if raw_text.startswith("```json"):
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1].split("```")[0].strip()

        draft = json.loads(raw_text)
        return {
            "draft_post": draft,
            "status": "REVIEWING"
        }
    except Exception as err:
        return {
            "status": "FAILED",
            "error": f"Writer Agent LLM generation error: {err}"
        }


def node_qc_evaluate(state: ContentGraphState) -> Dict[str, Any]:
    """Node 3: Quality Control Reviewer Agent evaluates draft against brand context."""
    if not api_key:
        return {"status": "FAILED", "error": "GEMINI_API_KEY missing for QC Evaluator."}

    draft = state.get("draft_post")
    if not draft:
        return {"status": "FAILED", "error": "No draft post available for QC evaluation."}

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key, temperature=0.1)

    target_brand = state.get("target_brand", "General Brand")
    brand_knowledge = state.get("brand_knowledge", "")

    system_prompt = (
        "You are a strict Senior Brand Quality Control (QC) Strategist AI.\n"
        "Evaluate the candidate social media post against brand guidelines and factual context.\n"
        "Scoring Scale (0.0 to 10.0):\n"
        "- Brand Alignment & Voice: 0-3.0 pts\n"
        "- Factual Accuracy & Anti-Hallucination: 0-4.0 pts\n"
        "- Hook & Engagement Value: 0-3.0 pts\n\n"
        "Return ONLY a valid raw JSON object with keys:\n"
        "- score: float between 0.0 and 10.0\n"
        "- is_approved: boolean (true if score >= 8.0, false if score < 8.0)\n"
        "- feedback: concise explanation of score\n"
        "- improvements: array of specific actionable revision instructions if score < 8.0\n"
    )

    user_prompt = (
        f"Target Brand: {target_brand}\n"
        f"Brand Knowledge Context:\n{brand_knowledge}\n\n"
        f"Candidate Post Draft JSON:\n{json.dumps(draft, ensure_ascii=False)}"
    )

    try:
        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        raw_text = response.content.strip()
        
        if raw_text.startswith("```json"):
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1].split("```")[0].strip()

        qc = json.loads(raw_text)
        score = float(qc.get("score", 7.0))
        is_approved = bool(qc.get("is_approved", score >= 8.0))

        return {
            "qc_review": {
                "score": score,
                "is_approved": is_approved,
                "feedback": qc.get("feedback", "QC Evaluation complete."),
                "improvements": qc.get("improvements", [])
            }
        }
    except Exception as err:
        # Honest failure if QC LLM evaluation breaks
        return {
            "status": "FAILED",
            "error": f"QC Evaluator LLM execution failed: {err}"
        }


def node_format_approval(state: ContentGraphState) -> Dict[str, Any]:
    """Node 4: Prepares final post asset with QC audit lineage for Human Approval Checkpoint."""
    return {"status": "WAITING_APPROVAL"}


def should_revise(state: ContentGraphState) -> str:
    """Conditional Edge: Decides whether to loop back for revision or proceed to approval."""
    if state.get("status") == "FAILED":
        return END

    qc_review = state.get("qc_review")
    revision_count = state.get("revision_count", 0)

    if qc_review and not qc_review.get("is_approved") and revision_count < 2:
        state["revision_count"] = revision_count + 1
        return "node_write_content"
    
    return "node_format_approval"


def build_content_graph():
    """Builds and compiles the LangGraph Content Generation StateGraph."""
    workflow = StateGraph(ContentGraphState)

    workflow.add_node("node_retrieve_knowledge", node_retrieve_knowledge)
    workflow.add_node("node_write_content", node_write_content)
    workflow.add_node("node_qc_evaluate", node_qc_evaluate)
    workflow.add_node("node_format_approval", node_format_approval)

    workflow.add_edge(START, "node_retrieve_knowledge")
    workflow.add_edge("node_retrieve_knowledge", "node_write_content")
    workflow.add_edge("node_write_content", "node_qc_evaluate")

    workflow.add_conditional_edges(
        "node_qc_evaluate",
        should_revise,
        {
            "node_write_content": "node_write_content",
            "node_format_approval": "node_format_approval",
            END: END
        }
    )

    workflow.add_edge("node_format_approval", END)

    memory = MemorySaver()
    return workflow.compile(checkpointer=memory)


# Global compiled graph instance
content_graph = build_content_graph()


def run_langgraph_content_pipeline(
    topic: str,
    workspace_id: str = "default",
    brand_id: str = "default",
    target_brand: str = "General Brand",
    thread_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the LangGraph Self-Correction Content Pipeline.
    Returns final state including draft_post, qc_review lineage, and status.
    """
    initial_state: ContentGraphState = {
        "workspace_id": workspace_id,
        "brand_id": brand_id,
        "topic": topic,
        "target_brand": target_brand,
        "revision_count": 0,
        "status": "QUEUED"
    }

    config = {"configurable": {"thread_id": thread_id or f"thread_{os.urandom(6).hex()}"}}
    final_state = content_graph.invoke(initial_state, config=config)

    return {
        "workspace_id": final_state.get("workspace_id"),
        "brand_id": final_state.get("brand_id"),
        "topic": final_state.get("topic"),
        "target_brand": final_state.get("target_brand"),
        "status": final_state.get("status", "FAILED"),
        "draft_post": final_state.get("draft_post"),
        "qc_review": final_state.get("qc_review"),
        "revision_count": final_state.get("revision_count", 0),
        "error": final_state.get("error")
    }


# ============================================================================
# FEATURE 4: AI IMAGE GENERATION & VISUAL PROMPT SELF-CORRECTION LOOP
# ============================================================================

class ImageGraphState(TypedDict, total=False):
    workspace_id: str
    brand_id: str
    topic: str
    target_brand: str
    visual_style: str
    aspect_ratio: str
    brand_visual_identity: str
    image_prompt_spec: Optional[Dict[str, Any]]
    qc_eval: Optional[Dict[str, Any]]
    revision_count: int
    status: str
    error: Optional[str]


def node_fetch_visual_brand_identity(state: ImageGraphState) -> Dict[str, Any]:
    """Node 1: Retrieves brand visual identity guidelines from RAG knowledge."""
    ws_id = state.get("workspace_id", "default")
    br_id = state.get("brand_id", "default")
    topic = state.get("topic", "")

    try:
        query_str = f"visual brand guidelines color palette aesthetic mood {topic}"
        rag_res = km.query_knowledge(query_text=query_str, workspace_id=ws_id, brand_id=br_id)
        knowledge_text = rag_res.get("answer", "No specific visual brand guidelines found.")
        return {"brand_visual_identity": knowledge_text, "status": "CRAFTING_PROMPT"}
    except Exception as err:
        return {"brand_visual_identity": f"Visual identity query error: {err}", "status": "CRAFTING_PROMPT"}


def node_craft_image_prompt(state: ImageGraphState) -> Dict[str, Any]:
    """Node 2: Prompt Engineer Agent drafts/revises hyper-detailed AI image prompts."""
    if not api_key:
        return {
            "status": "FAILED",
            "error": "GEMINI_API_KEY is missing or invalid. Cannot execute LangGraph Image Prompt Agent."
        }

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key, temperature=0.4)
    
    topic = state.get("topic", "")
    target_brand = state.get("target_brand", "General Brand")
    visual_style = state.get("visual_style", "Modern Minimalist")
    aspect_ratio = state.get("aspect_ratio", "1:1")
    brand_visual_identity = state.get("brand_visual_identity", "")
    qc_eval = state.get("qc_eval")
    revision_count = state.get("revision_count", 0)

    revision_instructions = ""
    if qc_eval and not qc_eval.get("is_approved"):
        feedback = qc_eval.get("feedback", "")
        improvements = ", ".join(qc_eval.get("improvements", []))
        revision_instructions = (
            f"\n\n[REVISION NOTICE - ATTEMPT {revision_count + 1}]:\n"
            f"Your previous visual prompt specification scored {qc_eval.get('score', 0)}/10 and was REJECTED by Visual QC.\n"
            f"QC Feedback: {feedback}\n"
            f"Actionable Fixes Required: {improvements}\n"
            "You MUST update the prompt and negative prompt to address all feedback."
        )

    system_prompt = (
        "You are an expert AI Prompt Engineer & Visual Creative Director specializing in Midjourney v6, DALL-E 3, and Flux.1.\n"
        "Generate a complete, production-ready AI image generation specification.\n"
        "Return ONLY a valid raw JSON object (no markdown, no ```json wrapper) with keys:\n"
        "- positive_prompt: Highly descriptive image generation prompt (subject, lighting, camera angle, textures, mood, render engine details)\n"
        "- negative_prompt: Unwanted elements, artifacts, poor lighting, text overlay restrictions\n"
        "- color_palette: Array of dominant color descriptions or hex codes\n"
        "- lighting_and_composition: Details on lighting (e.g. 'cinematic golden hour', 'studio softbox') and composition (e.g. 'rule of thirds, close-up shot')\n"
        "- suggested_aspect_ratio: Aspect ratio (e.g. '1:1', '9:16', '16:9')\n"
        "- tool_settings: Object containing recommended parameters like '--ar 1:1 --v 6.0 --style raw' or DALL-E 3 HD quality preset\n"
    )

    user_prompt = (
        f"Target Brand: {target_brand}\n"
        f"Concept / Topic: {topic}\n"
        f"Preferred Aesthetic Style: {visual_style}\n"
        f"Target Aspect Ratio: {aspect_ratio}\n\n"
        f"Brand Visual Identity RAG Context:\n{brand_visual_identity}"
        f"{revision_instructions}"
    )

    try:
        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        raw_text = response.content.strip()
        
        if raw_text.startswith("```json"):
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1].split("```")[0].strip()

        spec = json.loads(raw_text)
        return {
            "image_prompt_spec": spec,
            "status": "EVALUATING"
        }
    except Exception as err:
        return {
            "status": "FAILED",
            "error": f"Image Prompt Engineer LLM generation error: {err}"
        }


def node_eval_image_prompt(state: ImageGraphState) -> Dict[str, Any]:
    """Node 3: Visual QC Evaluator Agent scores visual prompt specification."""
    if not api_key:
        return {"status": "FAILED", "error": "GEMINI_API_KEY missing for Visual QC Evaluator."}

    spec = state.get("image_prompt_spec")
    if not spec:
        return {"status": "FAILED", "error": "No image prompt spec available for Visual QC evaluation."}

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key, temperature=0.1)

    target_brand = state.get("target_brand", "General Brand")
    visual_style = state.get("visual_style", "Modern Minimalist")

    system_prompt = (
        "You are a strict Senior Visual QC Evaluator for AI-generated brand imagery.\n"
        "Evaluate the candidate AI image prompt specification against aesthetics, visual clarity, and brand guidelines.\n"
        "Scoring Scale (0.0 to 10.0):\n"
        "- Visual Detail & Prompt Richness: 0-3.0 pts\n"
        "- Brand & Aesthetic Alignment: 0-3.0 pts\n"
        "- Negative Prompt Quality & Artifact Avoidance: 0-4.0 pts\n\n"
        "Return ONLY a valid raw JSON object with keys:\n"
        "- score: float between 0.0 and 10.0\n"
        "- is_approved: boolean (true if score >= 8.0, false if score < 8.0)\n"
        "- feedback: concise explanation of score\n"
        "- improvements: array of specific actionable prompt refinements if score < 8.0\n"
    )

    user_prompt = (
        f"Target Brand: {target_brand}\n"
        f"Target Style: {visual_style}\n\n"
        f"Candidate Image Prompt Spec JSON:\n{json.dumps(spec, ensure_ascii=False)}"
    )

    try:
        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        raw_text = response.content.strip()
        
        if raw_text.startswith("```json"):
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1].split("```")[0].strip()

        qc = json.loads(raw_text)
        score = float(qc.get("score", 7.0))
        is_approved = bool(qc.get("is_approved", score >= 8.0))

        return {
            "qc_eval": {
                "score": score,
                "is_approved": is_approved,
                "feedback": qc.get("feedback", "Visual QC Evaluation complete."),
                "improvements": qc.get("improvements", [])
            }
        }
    except Exception as err:
        return {
            "status": "FAILED",
            "error": f"Visual QC Evaluator LLM execution failed: {err}"
        }


def node_finalize_image_spec(state: ImageGraphState) -> Dict[str, Any]:
    """Node 4: Finalizes image spec for generation dispatches."""
    return {"status": "READY_FOR_GENERATION"}


def should_refine_image_prompt(state: ImageGraphState) -> str:
    """Conditional Edge: Decides whether to loop back for visual prompt refinement."""
    if state.get("status") == "FAILED":
        return END

    qc_eval = state.get("qc_eval")
    revision_count = state.get("revision_count", 0)

    if qc_eval and not qc_eval.get("is_approved") and revision_count < 2:
        state["revision_count"] = revision_count + 1
        return "node_craft_image_prompt"
    
    return "node_finalize_image_spec"


def build_image_prompt_graph():
    """Builds and compiles the LangGraph Image Prompt Generation StateGraph."""
    workflow = StateGraph(ImageGraphState)

    workflow.add_node("node_fetch_visual_brand_identity", node_fetch_visual_brand_identity)
    workflow.add_node("node_craft_image_prompt", node_craft_image_prompt)
    workflow.add_node("node_eval_image_prompt", node_eval_image_prompt)
    workflow.add_node("node_finalize_image_spec", node_finalize_image_spec)

    workflow.add_edge(START, "node_fetch_visual_brand_identity")
    workflow.add_edge("node_fetch_visual_brand_identity", "node_craft_image_prompt")
    workflow.add_edge("node_craft_image_prompt", "node_eval_image_prompt")

    workflow.add_conditional_edges(
        "node_eval_image_prompt",
        should_refine_image_prompt,
        {
            "node_craft_image_prompt": "node_craft_image_prompt",
            "node_finalize_image_spec": "node_finalize_image_spec",
            END: END
        }
    )

    workflow.add_edge("node_finalize_image_spec", END)

    memory = MemorySaver()
    return workflow.compile(checkpointer=memory)


image_prompt_graph = build_image_prompt_graph()


def run_langgraph_image_prompt_pipeline(
    topic: str,
    workspace_id: str = "default",
    brand_id: str = "default",
    target_brand: str = "General Brand",
    visual_style: str = "Modern Minimalist",
    aspect_ratio: str = "1:1",
    thread_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the LangGraph Visual Prompt & Image Generation Self-Correction Pipeline.
    """
    initial_state: ImageGraphState = {
        "workspace_id": workspace_id,
        "brand_id": brand_id,
        "topic": topic,
        "target_brand": target_brand,
        "visual_style": visual_style,
        "aspect_ratio": aspect_ratio,
        "revision_count": 0,
        "status": "QUEUED"
    }

    config = {"configurable": {"thread_id": thread_id or f"thread_img_{os.urandom(6).hex()}"}}
    final_state = image_prompt_graph.invoke(initial_state, config=config)

    return {
        "workspace_id": final_state.get("workspace_id"),
        "brand_id": final_state.get("brand_id"),
        "topic": final_state.get("topic"),
        "target_brand": final_state.get("target_brand"),
        "visual_style": final_state.get("visual_style", visual_style),
        "aspect_ratio": final_state.get("aspect_ratio", aspect_ratio),
        "status": final_state.get("status", "FAILED"),
        "visual_spec": final_state.get("image_prompt_spec"),
        "qc_eval": final_state.get("qc_eval"),
        "revision_count": final_state.get("revision_count", 0),
        "error": final_state.get("error")
    }

