from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class SentimentDistribution(BaseModel):
    positive_pct: float = Field(default=65.0, description="Percentage of positive sentiment comments")
    neutral_pct: float = Field(default=25.0, description="Percentage of neutral/inquiry comments")
    negative_pct: float = Field(default=10.0, description="Percentage of negative/objection comments")


class HighIntentLead(BaseModel):
    user: str = Field(description="Username of commenter with high purchase intent")
    text: str = Field(description="Comment text showing purchase intent")
    intent_type: str = Field(description="e.g. Price Query, Location Check, Purchase Request")


class SuggestedReply(BaseModel):
    comment_id: str = Field(description="Unique ID of the analyzed Instagram comment")
    original_comment: str = Field(description="The original user comment text")
    category: Literal["inquiry", "objection", "complaint", "compliment"] = Field(
        description="Sentiment and intention classification category"
    )
    draft_options: List[str] = Field(
        description="2-3 persuasive, elegant, and empathetic draft reply variations"
    )
    status: str = Field(
        default="pending_review",
        description="Human-in-the-loop review status (must be pending_review)",
    )


class AnalysisResult(BaseModel):
    topic: str = Field(description="The primary hashtag, URL, handle, or topic analyzed")
    target_type: str = Field(default="url", description="Target type: url, handle, or hashtag")
    depth: str = Field(default="standard", description="Scraping depth: quick, standard, or deep")
    total_comments_analyzed: int = Field(description="Total number of comments analyzed")
    sentiment_distribution: Optional[SentimentDistribution] = Field(default_factory=SentimentDistribution)
    high_intent_leads: List[HighIntentLead] = Field(default_factory=list)
    pain_points: List[str] = Field(description="List of dominant audience pain points")
    actionable_insights: List[str] = Field(description="Strategic content and marketing insights")
    suggested_replies: List[SuggestedReply] = Field(
        description="List of suggested replies awaiting human review"
    )


class AnalysisRequest(BaseModel):
    topic: str = Field(..., description="Hashtag, topic keyword, handle, or target URL")
    target_url: Optional[str] = Field(None, description="Optional direct Instagram post URL")
    target_type: Optional[str] = Field("url", description="Target type: 'url', 'handle', or 'hashtag'")
    depth: Optional[str] = Field("standard", description="Scraping depth: 'quick' (20), 'standard' (100), or 'deep' (300+)")
    workspace_id: Optional[str] = Field("default-workspace", description="Multi-tenant workspace ID")


class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # "queued", "processing", "completed", "failed"
    result: Optional[AnalysisResult] = None
    error: Optional[Dict[str, Any] | str | Any] = None


class TrendContentItem(BaseModel):
    headline_hook: str = Field(description="Captivating headline or hook for social media (Reel/Carousel)")
    core_takeaway: str = Field(description="Key insight or core takeaway from the trend source")
    content_format: str = Field(default="Reel Script & Caption", description="Format: Carousel, Reel Script, Infographic, etc.")
    caption: str = Field(description="Full Instagram/TikTok caption with emojis and call to action")
    hashtags: List[str] = Field(description="List of relevant hashtags")
    image_prompt: str = Field(description="Detailed prompt for AI Image Generation (DALL-E 3 / Midjourney)")


class TrendToContentRequest(BaseModel):
    source_urls: List[str] = Field(..., description="List of live Web or YouTube URLs to analyze")
    target_brand: Optional[str] = Field("General Brand", description="Target brand name or niche focus")
    count: Optional[int] = Field(3, description="Number of content items to generate")


class TrendToContentResult(BaseModel):
    topic_summary: str = Field(description="Summary of the analyzed trends and key insights")
    target_brand: str = Field(description="The brand context used for content generation")
    source_count: int = Field(description="Total number of web/video sources analyzed")
    generated_posts: List[TrendContentItem] = Field(description="Generated social media post items")


class KnowledgeUploadResponse(BaseModel):
    status: str
    workspace_id: str
    filename: str
    saved_path: str
    total_documents_indexed: int


class KnowledgeQueryRequest(BaseModel):
    query: str = Field(..., description="The query or question about brand guidelines / SOP")
    workspace_id: Optional[str] = Field("default", description="Workspace ID for brand context separation")


class KnowledgeQueryResponse(BaseModel):
    status: str
    workspace_id: str
    brand_id: Optional[str] = "default"
    query: str
    answer: str
    sources: List[Dict] = Field(default_factory=list)


class KnowledgeDocumentRecord(BaseModel):
    document_id: str = Field(..., description="Unique document ID (e.g. doc_...)")
    workspace_id: str = Field(..., description="Authenticated Workspace ID")
    brand_id: Optional[str] = Field("default", description="Brand ID context")
    filename: str = Field(..., description="Original filename")
    content_hash: str = Field(..., description="SHA256 hash of file content for deduplication")
    mime_type: str = Field(default="text/plain", description="File MIME type")
    source_type: str = Field(default="txt", description="Source type: pdf, docx, txt, web, youtube")
    status: Literal["UPLOADED", "PROCESSING", "INDEXED", "FAILED"] = Field(default="UPLOADED")
    error_message: Optional[str] = None
    created_at: str = Field(..., description="ISO creation timestamp")
    updated_at: str = Field(..., description="ISO update timestamp")


class ProvenanceSource(BaseModel):
    document_id: str = Field(..., description="Document ID")
    filename: str = Field(..., description="Source document filename")
    source_type: str = Field(default="document", description="Source type: document, web, youtube")
    chunk_id: Optional[str] = Field(None, description="Vector node/chunk ID")
    score: Optional[float] = Field(None, description="Relevance score (0.0 to 1.0)")
    content_snippet: str = Field(..., description="Extracted content snippet")


class SourceArtifact(BaseModel):
    source_id: str = Field(..., description="Unique source artifact ID (e.g. src_...)")
    url: str = Field(..., description="Source URL")
    source_type: str = Field(..., description="web or youtube")
    title: str = Field(default="Web Source", description="Source page title or video title")
    content_hash: str = Field(..., description="SHA256 content hash")
    retrieved_at: str = Field(..., description="ISO retrieval timestamp")
    status: str = Field(default="SUCCESS", description="SUCCESS, FAILED, or SANITIZED")


class DerivedInsight(BaseModel):
    insight_id: str = Field(..., description="Unique insight ID")
    source_id: str = Field(..., description="Associated SourceArtifact ID")
    summary: str = Field(..., description="Key insight summary")
    key_takeaways: List[str] = Field(default_factory=list)


class GeneratedContentWithProvenance(BaseModel):
    content_id: str = Field(..., description="Unique content ID")
    source_references: List[Dict] = Field(default_factory=list, description="Provenance lineage to SourceArtifacts")
    headline_hook: str = Field(..., description="Catchy headline hook")
    core_takeaway: str = Field(..., description="Core takeaway derived from sources")
    content_format: str = Field(default="Reel Script & Caption")
    caption: str = Field(..., description="Full caption with emojis and CTA")
    hashtags: List[str] = Field(default_factory=list)
    image_prompt: str = Field(..., description="Prompt for AI Image Generation")
    confidence_score: float = Field(default=0.95, description="Attribution confidence score")


class LangGraphContentRequest(BaseModel):
    topic: str = Field(..., description="Content topic, campaign theme, or keyword")
    target_brand: Optional[str] = Field("General Brand", description="Target brand name or niche focus")
    workspace_id: Optional[str] = Field(None, description="Workspace ID override")
    brand_id: Optional[str] = Field(None, description="Brand ID override")


class LangGraphContentResponse(BaseModel):
    workspace_id: Optional[str] = "default"
    brand_id: Optional[str] = "default"
    topic: str
    target_brand: str
    status: str  # WAITING_APPROVAL, COMPLETED, FAILED
    draft_post: Optional[Dict] = None
    qc_review: Optional[Dict] = None
    revision_count: int = 0
    error: Optional[str] = None


class ImagePromptGraphRequest(BaseModel):
    topic: str = Field(..., description="Image concept, product description, or post theme")
    target_brand: Optional[str] = Field("General Brand", description="Target brand name or niche focus")
    visual_style: Optional[str] = Field("Modern Minimalist", description="Preferred visual aesthetic style")
    aspect_ratio: Optional[str] = Field("1:1", description="Target aspect ratio: 1:1, 9:16, 16:9")
    workspace_id: Optional[str] = Field(None, description="Workspace ID override")
    brand_id: Optional[str] = Field(None, description="Brand ID override")



class ImagePromptGraphResponse(BaseModel):
    workspace_id: Optional[str] = "default"
    brand_id: Optional[str] = "default"
    topic: str
    target_brand: str
    visual_style: str = "Modern Minimalist"
    aspect_ratio: str = "1:1"
    status: str  # READY_FOR_GENERATION, FAILED
    visual_spec: Optional[Dict] = None
    qc_eval: Optional[Dict] = None
    revision_count: int = 0
    error: Optional[str] = None


class MarketGapAnalysis(BaseModel):
    topic_core: str = Field(description="Core main topic or idea")
    saturated_angle: str = Field(description="Overused or boring angle in the market")
    contrarian_angle: str = Field(description="Fresh, counter-intuitive or under-served angle")
    audience_pain_trigger: str = Field(description="Specific pain point or frustration touched")
    saturation_score: int = Field(default=50, description="Saturation score from 1 to 100")


class ContentPillarItem(BaseModel):
    pillar_name: str = Field(description="Name of content pillar (e.g. Educational, Authority, Story)")
    core_message: str = Field(description="Core message to communicate")


class HookItem(BaseModel):
    formula_type: str = Field(description="Negative Bias, Curiosity Gap, Contrarian, Storytelling, or Tangible Result")
    verbal_hook: str = Field(description="The spoken or primary header sentence")
    on_screen_text: str = Field(description="Concise 3-5 word on-screen text for seconds 0-2")
    visual_action_cue: str = Field(description="Visual action or camera movement cue for seconds 0-3")
    psychological_trigger: str = Field(description="Why the audience will stop scrolling")
    retention_score: int = Field(default=85, description="Predicted retention score from 1 to 100")


class IdeaMatrixItem(BaseModel):
    idea_id: str = Field(description="Unique idea identifier")
    title: str = Field(description="Short idea headline")
    impact: Literal["High", "Medium", "Low"] = Field(default="High")
    effort: Literal["High", "Medium", "Low"] = Field(default="Low")
    contrarian_angle: str = Field(description="Unusual angle for this idea")
    selected_hook: HookItem = Field(description="Primary hook associated with this idea")


class ResearchModuleRequest(BaseModel):
    topic: str = Field(..., description="Target niche topic, keyword, or campaign idea")
    reference_urls: List[str] = Field(default_factory=list, description="Optional competitor URLs or YouTube links")
    target_brand: Optional[str] = Field("General Brand", description="Target brand context")
    workspace_id: Optional[str] = Field("default", description="Workspace ID")


class ResearchModuleResult(BaseModel):
    topic: str
    target_brand: str
    market_gap_analysis: MarketGapAnalysis
    content_pillars: List[ContentPillarItem] = Field(default_factory=list)
    hooks: List[HookItem] = Field(default_factory=list)
    ideas_matrix: List[IdeaMatrixItem] = Field(default_factory=list)
    recommended_content_format: str = Field(default="Short-form Video")


class PromoteIdeaRequest(BaseModel):
    idea_id: str = Field(..., description="Idea ID from Research Matrix")
    title: str = Field(..., description="Idea title")
    contrarian_angle: str = Field(..., description="Selected contrarian angle")
    verbal_hook: str = Field(..., description="Chosen hook")
    target_brand: Optional[str] = Field("General Brand", description="Target brand")
    workspace_id: Optional[str] = Field("default", description="Workspace ID")



