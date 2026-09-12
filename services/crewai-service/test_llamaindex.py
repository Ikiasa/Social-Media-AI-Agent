import sys
import os

def test_imports():
    print("Testing LlamaIndex imports...")
    try:
        import llama_index.core
        from llama_index.llms.gemini import Gemini
        from llama_index.embeddings.gemini import GeminiEmbedding
        print("SUCCESS: LlamaIndex and Gemini integration modules imported successfully!")
    except Exception as e:
        print(f"FAILED: Import error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_imports()
