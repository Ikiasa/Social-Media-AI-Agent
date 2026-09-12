import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process

try:
    from crewai import LLM
except ImportError:
    LLM = None

from models import AnalysisResult, SuggestedReply
from tools.scraper_tool import scrape_instagram_comments_tool

load_dotenv(override=True)

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""

is_valid_key = bool(api_key and not api_key.startswith("your_") and not api_key.startswith("mock_") and len(api_key) > 15)

if is_valid_key:
    os.environ["GEMINI_API_KEY"] = api_key
    os.environ["GOOGLE_API_KEY"] = api_key
    model_name = os.getenv("LLM_MODEL", "gemini/gemini-3.6-flash")
    if LLM is not None:
        llm = LLM(
            model=model_name,
            api_key=api_key,
            temperature=0.3,
            max_retries=5,
        )
    else:
        llm = model_name
else:
    llm = None

# 1. Scraper & Intake Specialist Agent
scraper_agent = Agent(
    role="Instagram Intelligence Collector",
    goal="Scrape, pull, and intake Instagram posts, metrics, and raw comments for a given topic or URL.",
    backstory=(
        "You are a methodical data intake specialist. You use scraping tools to gather clean, "
        "accurate comment data and post metadata without missing critical audience interactions."
    ),
    tools=[scrape_instagram_comments_tool],
    verbose=True,
    llm=llm or "gemini/gemini-1.5-flash",
)

# 2. Cluster & Sentiment Strategist Agent (Radit)
analyst_agent = Agent(
    role="Radit - Multi-Perspective Audience Analyst",
    goal="Group comments into categories (Inquiry, Objection, Complaint, Compliment) and extract core audience pain points.",
    backstory=(
        "You are Radit, a senior social media strategist. You are sharp, analytical, skeptical of vanity metrics, "
        "and focused on consumer psychology. You analyze audience sentiments to find genuine pain points."
    ),
    verbose=True,
    llm=llm or "gemini/gemini-1.5-flash",
)

# 3. Response & Tactical Drafter Agent
responder_agent = Agent(
    role="Brand Communication & Engagement Tactician",
    goal="Draft 2-3 persuasive, empathetic, elegant, and solutif reply options for each analyzed comment.",
    backstory=(
        "You are an elite brand engagement tactician. You write natural, human-like responses that address "
        "customer doubts, provide clear information, and build long-term brand loyalty."
    ),
    verbose=True,
    llm=llm or "gemini/gemini-1.5-flash",
)

# 4. Database Dispatcher Agent
archivist_agent = Agent(
    role="Pipeline Sync Specialist",
    goal="Format the final analysis into standardized JSON matching the required schema with pending_review status.",
    backstory=(
        "You are a disciplined data architect. You format analysis insights and draft options into a valid "
        "JSON object ensuring all suggested replies have status 'pending_review' for Human-in-the-Loop review."
    ),
    verbose=True,
    llm=llm or "gemini/gemini-1.5-flash",
)


class MockCrewRunner:
    def __init__(self, topic: str):
        self.topic = topic

    def kickoff(self) -> AnalysisResult:
        raise RuntimeError("MockCrewRunner is restricted to test environments only.")


def create_instagram_analysis_crew(topic_or_url: str):
    if not is_valid_key:
        if os.getenv("NODE_ENV") == "test":
            return MockCrewRunner(topic_or_url)
        raise RuntimeError("GEMINI_API_KEY is missing or invalid. Cannot execute CrewAI analysis in production.")

    task_scrape = Task(
        description=f"Scrape Instagram comments and metadata for topic or URL: '{topic_or_url}'.",
        expected_output="Raw JSON string containing post metadata and list of comments.",
        agent=scraper_agent,
    )

    task_analyze = Task(
        description=(
            "Analyze the scraped comments. Cluster them into: 'inquiry', 'objection', 'complaint', or 'compliment'. "
            "Identify top audience pain points and actionable insights."
        ),
        expected_output="Categorized comments with identified pain points and strategic insights.",
        agent=analyst_agent,
    )

    task_draft = Task(
        description=(
            "For each categorized comment, draft 2-3 distinct response options. "
            "Ensure answers are persuasive, polite, elegant, and directly address customer concerns."
        ),
        expected_output="List of comments with 2-3 draft response options each.",
        agent=responder_agent,
    )

    task_format = Task(
        description=(
            "Assemble the final analysis into a structured JSON matching AnalysisResult model. "
            "Ensure topic, total_comments_analyzed, pain_points, actionable_insights, and suggested_replies "
            "are populated correctly, and every suggested reply has status 'pending_review'."
        ),
        expected_output="A structured JSON matching the AnalysisResult Pydantic schema.",
        agent=archivist_agent,
        output_json=AnalysisResult,
    )

    return Crew(
        agents=[scraper_agent, analyst_agent, responder_agent, archivist_agent],
        tasks=[task_scrape, task_analyze, task_draft, task_format],
        process=Process.sequential,
        verbose=True,
    )
