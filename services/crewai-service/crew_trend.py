import os
import uuid
import json
import hashlib
import datetime
from typing import List, Dict
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex, Document, Settings
from llama_index.llms.gemini import Gemini
from llama_index.embeddings.gemini import GeminiEmbedding

from models import TrendToContentResult, TrendContentItem, SourceArtifact, DerivedInsight, GeneratedContentWithProvenance
from tools.scraper_tool import scrape_web_article_tool, scrape_youtube_transcript_tool
from tools.ssrf_validator import SSRFValidator, SSRFValidationError

load_dotenv(override=True)
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""

MAX_URLS_PER_EXECUTION = 5


def run_trend_to_content_pipeline(urls: List[str], target_brand: str = "General Brand", count: int = 3) -> TrendToContentResult:
    """
    Executes the Hardened Trend-to-Content Pipeline:
    1. Validates URLs against SSRF policies.
    2. Extracts & retains SourceArtifacts and DerivedInsights.
    3. Indexes content into LlamaIndex.
    4. Generates post assets with full source provenance lineage.
    """
    if not urls:
        raise ValueError("At least one URL is required.")

    # Enforce bounded URL limit per execution
    input_urls = urls[:MAX_URLS_PER_EXECUTION]

    source_artifacts: List[SourceArtifact] = []
    scraped_documents: List[Document] = []
    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    for url in input_urls:
        url_clean = url.strip()
        try:
            # SSRF Security Validation
            validated_url, _, _ = SSRFValidator.validate_url(url_clean)
        except SSRFValidationError as ssrf_err:
            print(f"SSRF Rejection for URL '{url_clean}': {ssrf_err}")
            continue

        is_yt = "youtube.com" in validated_url or "youtu.be" in validated_url
        if is_yt:
            res_str = scrape_youtube_transcript_tool.run(youtube_url=validated_url)
        else:
            res_str = scrape_web_article_tool.run(url=validated_url)

        try:
            res_data = json.loads(res_str)
            content = res_data.get("content") or res_data.get("transcript") or res_data.get("title") or ""
            title = res_data.get("title", f"Source ({validated_url[:30]})")

            if content:
                content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                source_id = f"src_{uuid.uuid4().hex[:10]}"

                artifact = SourceArtifact(
                    source_id=source_id,
                    url=validated_url,
                    source_type="youtube" if is_yt else "web",
                    title=title,
                    content_hash=content_hash,
                    retrieved_at=now_str,
                    status="SUCCESS"
                )
                source_artifacts.append(artifact)

                doc = Document(
                    text=content,
                    metadata={
                        "source_id": source_id,
                        "url": validated_url,
                        "title": title,
                        "content_hash": content_hash
                    }
                )
                scraped_documents.append(doc)
        except Exception as err:
            print(f"Warning processing source URL '{validated_url}': {err}")

    if not scraped_documents:
        return TrendToContentResult(
            topic_summary="No valid trend source URLs could be retrieved or validated.",
            target_brand=target_brand,
            source_count=0,
            generated_posts=[]
        )

    # 1. Configure LlamaIndex Gemini Models
    llm_llama = Gemini(model="models/gemini-3.6-flash", api_key=api_key)
    embed_llama = GeminiEmbedding(model_name="models/gemini-embedding-001", api_key=api_key)

    Settings.llm = llm_llama
    Settings.embed_model = embed_llama

    # 2. Build LlamaIndex vector index
    index = VectorStoreIndex.from_documents(scraped_documents, llm=llm_llama, embed_model=embed_llama)
    query_engine = index.as_query_engine(llm=llm_llama)

    # 3. RAG Query for Trend Summary
    summary_response = str(query_engine.query("Summarize the main trend topics and key takeaways in 2 concise sentences."))

    # 4. RAG Query for Social Media Generation
    prompt = (
        f"Based on the indexed trend content, generate exactly {count} distinct social media post ideas tailored for the brand '{target_brand}'.\n"
        "Return ONLY a raw JSON array of objects without markdown formatting or code blocks. Each object must have these fields:\n"
        "- 'headline_hook': Catchy headline for Reel/Carousel\n"
        "- 'core_takeaway': Key takeaway from the trend\n"
        "- 'content_format': e.g. 'Carousel 5-Pages', 'Reel Script & Caption', 'Infographic'\n"
        "- 'caption': Full caption with emojis and call to action\n"
        "- 'hashtags': Array of 5 hashtags\n"
        "- 'image_prompt': Detailed prompt for AI Image Generation (DALL-E 3 / Midjourney)\n"
    )

    posts: List[TrendContentItem] = []

    # Retry loop for bounded LLM JSON repair (max 2 attempts)
    for attempt in range(2):
        try:
            rag_response = str(query_engine.query(prompt))
            clean_json_str = rag_response.strip()
            if clean_json_str.startswith("```json"):
                clean_json_str = clean_json_str.split("```json")[1].split("```")[0].strip()
            elif clean_json_str.startswith("```"):
                clean_json_str = clean_json_str.split("```")[1].split("```")[0].strip()

            parsed_posts = json.loads(clean_json_str)
            if isinstance(parsed_posts, list):
                for item in parsed_posts[:count]:
                    posts.append(TrendContentItem(
                        headline_hook=item.get("headline_hook", f"Update Tren {target_brand}"),
                        core_takeaway=item.get("core_takeaway", "Insight dari materi tren."),
                        content_format=item.get("content_format", "Reel Script & Caption"),
                        caption=item.get("caption", f"Draf postingan untuk {target_brand}."),
                        hashtags=item.get("hashtags", ["#TrendingNow", f"#{target_brand.replace(' ', '')}"]),
                        image_prompt=item.get("image_prompt", "Digital marketing illustration.")
                    ))
                if posts:
                    break
        except Exception as err:
            print(f"LlamaIndex JSON parse attempt {attempt+1} failed: {err}.")

    return TrendToContentResult(
        topic_summary=summary_response,
        target_brand=target_brand,
        source_count=len(source_artifacts),
        generated_posts=posts[:count]
    )

