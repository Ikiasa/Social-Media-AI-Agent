import os
from typing import Optional
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, load_index_from_storage
from llama_index.llms.gemini import Gemini
from llama_index.embeddings.gemini import GeminiEmbedding
from crewai.tools import tool

def get_llama_index(data_dir: str, storage_dir: Optional[str] = None) -> VectorStoreIndex:
    """
    Creates or loads a LlamaIndex VectorStoreIndex from a directory of documents.
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    
    from llama_index.core import Settings
    
    # Configure LLM & Embedding Model with Gemini
    llm = Gemini(model="models/gemini-3.6-flash", api_key=api_key)
    embed_model = GeminiEmbedding(model_name="models/gemini-embedding-001", api_key=api_key)
    
    Settings.llm = llm
    Settings.embed_model = embed_model
    
    if storage_dir and os.path.exists(storage_dir):
        storage_context = StorageContext.from_defaults(persist_dir=storage_dir)
        return load_index_from_storage(storage_context, llm=llm, embed_model=embed_model)
    
    if not os.path.exists(data_dir) or not os.listdir(data_dir):
        os.makedirs(data_dir, exist_ok=True)
        return None

    reader = SimpleDirectoryReader(data_dir)
    documents = reader.load_data()
    if not documents:
        return None
    
    index = VectorStoreIndex.from_documents(
        documents,
        llm=llm,
        embed_model=embed_model
    )
    
    if storage_dir:
        index.storage_context.persist(persist_dir=storage_dir)
        
    return index

def create_brand_knowledge_tool(data_dir: str = "./data/knowledge"):
    """
    Returns a CrewAI Tool wrapped around LlamaIndex RAG Query Engine.
    """
    index = get_llama_index(data_dir)
    query_engine = index.as_query_engine() if index else None

    @tool("Search Brand Knowledge & Strategy Docs")
    def search_brand_knowledge(query: str) -> str:
        """
        Use this tool to search internal brand guidelines, product catalogs, 
        target audience definitions, and content strategy documents.
        """
        if not query_engine:
            return "NO_KNOWLEDGE: Belum ada dokumen brand knowledge yang tersedia di repositori ini."
        response = query_engine.query(query)
        return str(response)

    return search_brand_knowledge
