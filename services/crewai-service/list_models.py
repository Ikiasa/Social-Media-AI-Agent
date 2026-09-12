import os
from dotenv import load_dotenv

load_dotenv(override=True)

api_key = os.getenv("GEMINI_API_KEY")

try:
    from google import genai
    client = genai.Client(api_key=api_key)
    print("Available Gemini models:")
    for m in client.models.list():
        print(" -", m.name)
except Exception as e:
    print("Error listing models:", e)
