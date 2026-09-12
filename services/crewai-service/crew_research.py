import os
import json
import uuid
from typing import List, Optional
from dotenv import load_dotenv
import google.generativeai as genai

from models import (
    ResearchModuleResult, MarketGapAnalysis, ContentPillarItem,
    HookItem, IdeaMatrixItem
)
from tools.scraper_tool import scrape_youtube_transcript_tool, scrape_web_article_tool

load_dotenv(override=True)
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""

if api_key:
    genai.configure(api_key=api_key)


def run_research_pipeline(
    topic: str,
    reference_urls: Optional[List[str]] = None,
    target_brand: str = "General Brand"
) -> ResearchModuleResult:
    """
    Executes the Comprehensive Research Module:
    1. Audience Miner: Extracts audience pain points & frustations from reference URLs or topic context.
    2. Strategist: Calculates Content Saturation Score (1-100), Saturated vs Contrarian Angles.
    3. Hook Specialist: Generates 5-10 Hooks across 5 psychological formulas.
    4. Critic/Scorer: Evaluates Visual Action Cues, Retention Scores (1-100), and 2x2 Idea Matrix.
    """
    scraped_context = ""
    if reference_urls:
        for url in reference_urls[:3]:
            url_clean = url.strip()
            if not url_clean:
                continue
            if "youtube.com" in url_clean or "youtu.be" in url_clean:
                res = scrape_youtube_transcript_tool.run(youtube_url=url_clean)
            else:
                res = scrape_web_article_tool.run(url=url_clean)
            scraped_context += f"\n--- Source ({url_clean}) ---\n{res[:1500]}\n"

    system_prompt = """
You are "Antigravity", a Principal Content Strategist & Viral Architecture Engine.
Your task is to analyze a raw topic/niche, map out market gaps, find audience pain points, generate 5-6 high-converting hooks with visual cues & retention scores, and construct a 2x2 Impact vs Effort Idea Matrix.

RULES:
1. Anti-Cliché: NO generic hooks like "Tips untuk kamu", "Tahukah kamu", or "Ini dia caranya". All hooks MUST use negative bias, open loops, or contrarian angles.
2. Market Gap: Find the overused/saturated angle vs the fresh contrarian angle. Calculate a saturation score (1-100).
3. Visual Cues: Each hook MUST include on_screen_text (3-5 words max for sec 0-2) and visual_action_cue (camera/actor action for sec 0-3).
4. Output MUST be valid JSON matching the exact schema below.

JSON SCHEMA:
{
  "market_gap_analysis": {
    "topic_core": "string",
    "saturated_angle": "string",
    "contrarian_angle": "string",
    "audience_pain_trigger": "string",
    "saturation_score": 75
  },
  "content_pillars": [
    {
      "pillar_name": "string",
      "core_message": "string"
    }
  ],
  "hooks": [
    {
      "formula_type": "Negative Bias | Curiosity Gap | Contrarian | Storytelling | Tangible Result",
      "verbal_hook": "string",
      "on_screen_text": "string",
      "visual_action_cue": "string",
      "psychological_trigger": "string",
      "retention_score": 92
    }
  ],
  "ideas_matrix": [
    {
      "idea_id": "idea_1",
      "title": "string",
      "impact": "High | Medium | Low",
      "effort": "Low | Medium | High",
      "contrarian_angle": "string",
      "selected_hook": {
        "formula_type": "Negative Bias",
        "verbal_hook": "string",
        "on_screen_text": "string",
        "visual_action_cue": "string",
        "psychological_trigger": "string",
        "retention_score": 90
      }
    }
  ],
  "recommended_content_format": "Short-form Video"
}
"""

    prompt = f"""
TOPIC TO RESEARCH: {topic}
TARGET BRAND CONTEXT: {target_brand}
SCRAPED REFERENCE CONTEXT:
{scraped_context if scraped_context else "No reference URLs provided. Use deep market domain knowledge for this niche."}

Analyze this topic and output the JSON strictly adhering to the schema.
"""

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"{system_prompt}\n\n{prompt}",
            generation_config={"response_mime_type": "application/json"}
        )
        raw_json = json.loads(response.text)

        # Parse market gap
        m_gap_data = raw_json.get("market_gap_analysis", {})
        market_gap = MarketGapAnalysis(
            topic_core=m_gap_data.get("topic_core", topic),
            saturated_angle=m_gap_data.get("saturated_angle", "Sudut pandang generik yang sudah banyak dibahas."),
            contrarian_angle=m_gap_data.get("contrarian_angle", "Sudut pandang alternatif berbasis psikologi."),
            audience_pain_trigger=m_gap_data.get("audience_pain_trigger", "Frustrasi audiens terhadap solusi biasa."),
            saturation_score=m_gap_data.get("saturation_score", 65)
        )

        # Parse pillars
        pillars = [
            ContentPillarItem(
                pillar_name=p.get("pillar_name", "Educational"),
                core_message=p.get("core_message", "")
            )
            for p in raw_json.get("content_pillars", [])
        ]

        # Parse hooks
        hooks = []
        for h in raw_json.get("hooks", []):
            hooks.append(HookItem(
                formula_type=h.get("formula_type", "Negative Bias"),
                verbal_hook=h.get("verbal_hook", ""),
                on_screen_text=h.get("on_screen_text", ""),
                visual_action_cue=h.get("visual_action_cue", ""),
                psychological_trigger=h.get("psychological_trigger", ""),
                retention_score=int(h.get("retention_score", 85))
            ))

        # Parse matrix ideas
        ideas = []
        for i, idea in enumerate(raw_json.get("ideas_matrix", [])):
            h_data = idea.get("selected_hook", {})
            hook_item = HookItem(
                formula_type=h_data.get("formula_type", "Contrarian"),
                verbal_hook=h_data.get("verbal_hook", idea.get("title", "")),
                on_screen_text=h_data.get("on_screen_text", "STOP SCROLLING"),
                visual_action_cue=h_data.get("visual_action_cue", "Zoom-in cepat ke layar"),
                psychological_trigger=h_data.get("psychological_trigger", "Curiosity"),
                retention_score=int(h_data.get("retention_score", 88))
            )
            ideas.append(IdeaMatrixItem(
                idea_id=idea.get("idea_id", f"idea_{i+1}_{uuid.uuid4().hex[:6]}"),
                title=idea.get("title", f"Idea #{i+1}"),
                impact=idea.get("impact", "High"),
                effort=idea.get("effort", "Low"),
                contrarian_angle=idea.get("contrarian_angle", market_gap.contrarian_angle),
                selected_hook=hook_item
            ))

        return ResearchModuleResult(
            topic=topic,
            target_brand=target_brand,
            market_gap_analysis=market_gap,
            content_pillars=pillars,
            hooks=hooks,
            ideas_matrix=ideas,
            recommended_content_format=raw_json.get("recommended_content_format", "Short-form Video")
        )

    except Exception as err:
        print(f"Error executing research pipeline: {err}")
        # Fallback structured result if LLM API call fails or mock key
        fallback_gap = MarketGapAnalysis(
            topic_core=topic,
            saturated_angle="Cara umum posting konten otomatis tanpa kurasi.",
            contrarian_angle="Mengapa kuantitas tanpa validasi psikologi membunuh algoritma Anda.",
            audience_pain_trigger="Posting puluhan konten tetapi sepi interaksi dan zero conversion.",
            saturation_score=78
        )
        fallback_hooks = [
            HookItem(
                formula_type="Negative Bias",
                verbal_hook=f"Hentikan strategi {topic} jika tidak mau akunmu sepi peminat.",
                on_screen_text="STOP CARA LAMA INI!",
                visual_action_cue="Close-up wajah serius, gestur stop ke arah kamera detik 0-1.",
                psychological_trigger="Ketakutan akan kehilangan hasil/jangkauan.",
                retention_score=92
            ),
            HookItem(
                formula_type="Contrarian",
                verbal_hook=f"Alasan kenapa top 1% brand membuang formula {topic} yang biasa dipakai orang.",
                on_screen_text="RAHASIA TOP 1% BRAND",
                visual_action_cue="Whip-zoom ke layar monitor gelap yang menampilkan statistik.",
                psychological_trigger="Ingin tahu rahasia eksklusif kompetitor.",
                retention_score=89
            )
        ]
        fallback_ideas = [
            IdeaMatrixItem(
                idea_id=f"idea_1_{uuid.uuid4().hex[:6]}",
                title=f"Bongkar Mitos {topic}",
                impact="High",
                effort="Low",
                contrarian_angle=fallback_gap.contrarian_angle,
                selected_hook=fallback_hooks[0]
            ),
            IdeaMatrixItem(
                idea_id=f"idea_2_{uuid.uuid4().hex[:6]}",
                title=f"Framework Retensi 3 Detik {topic}",
                impact="High",
                effort="Medium",
                contrarian_angle="Formulasi visual cue berbasis psikologi audiens.",
                selected_hook=fallback_hooks[1]
            )
        ]
        return ResearchModuleResult(
            topic=topic,
            target_brand=target_brand,
            market_gap_analysis=fallback_gap,
            content_pillars=[ContentPillarItem(pillar_name="Contrarian Authority", core_message=fallback_gap.contrarian_angle)],
            hooks=fallback_hooks,
            ideas_matrix=fallback_ideas,
            recommended_content_format="Short-form Video"
        )
