import os
from dotenv import load_dotenv

load_dotenv(override=True)

api_key = os.getenv("GEMINI_API_KEY")

try:
    from crewai import LLM
    llm = LLM(model="gemini/gemini-3.6-flash", api_key=api_key)
    res = llm.call(messages=[{"role": "user", "content": "Hello, respond with OK"}])
    print("CrewAI LLM gemini/gemini-3.6-flash success:", res)
except Exception as e:
    print("CrewAI LLM gemini/gemini-3.6-flash error:", type(e), e)
