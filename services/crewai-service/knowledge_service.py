import os
import uuid
import json
import hashlib
import datetime
from typing import Optional, List, Dict
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, load_index_from_storage, Settings
from llama_index.llms.gemini import Gemini
from llama_index.embeddings.gemini import GeminiEmbedding

from storage import KnowledgeStorage, FileKnowledgeStorage, StorageError
from models import KnowledgeDocumentRecord, ProvenanceSource

load_dotenv(override=True)
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""


class KnowledgeManager:
    def __init__(self, storage: Optional[KnowledgeStorage] = None):
        self.storage = storage or FileKnowledgeStorage()

    def _get_manifest_path(self, workspace_id: str, brand_id: Optional[str] = "default") -> str:
        files_dir = self.storage.get_files_dir(workspace_id, brand_id)
        parent_dir = os.path.dirname(files_dir)
        return os.path.join(parent_dir, "manifest.json")

    def _load_manifest(self, workspace_id: str, brand_id: Optional[str] = "default") -> Dict[str, Dict]:
        manifest_path = self._get_manifest_path(workspace_id, brand_id)
        if os.path.exists(manifest_path):
            try:
                with open(manifest_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Warning reading manifest file: {e}")
        return {}

    def _save_manifest(self, manifest: Dict[str, Dict], workspace_id: str, brand_id: Optional[str] = "default"):
        manifest_path = self._get_manifest_path(workspace_id, brand_id)
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

    def _get_llm_and_embed(self):
        llm = Gemini(model="models/gemini-3.6-flash", api_key=api_key)
        embed_model = GeminiEmbedding(model_name="models/gemini-embedding-001", api_key=api_key)
        Settings.llm = llm
        Settings.embed_model = embed_model
        return llm, embed_model

    def save_and_index_file(
        self,
        file_bytes: bytes,
        filename: str,
        workspace_id: str = "default",
        brand_id: Optional[str] = "default"
    ) -> Dict:
        clean_brand = brand_id or "default"
        manifest = self._load_manifest(workspace_id, clean_brand)

        # 1. Compute SHA256 content hash
        content_hash = hashlib.sha256(file_bytes).hexdigest()

        # 2. Check duplicate upload in workspace & brand scope
        for doc_id, rec in manifest.items():
            if rec.get("content_hash") == content_hash and rec.get("status") == "INDEXED":
                return {
                    "status": "duplicate",
                    "message": f"Document '{filename}' is identical to existing document '{rec.get('filename')}' (ID: {doc_id}). Skipping re-indexing.",
                    "document": rec
                }

        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
        now_str = datetime.datetime.utcnow().isoformat() + "Z"

        # Record UPLOADED state
        doc_record = KnowledgeDocumentRecord(
            document_id=doc_id,
            workspace_id=workspace_id,
            brand_id=clean_brand,
            filename=filename,
            content_hash=content_hash,
            mime_type="application/octet-stream" if filename.endswith((".pdf", ".docx")) else "text/plain",
            source_type=filename.split(".")[-1].lower() if "." in filename else "txt",
            status="UPLOADED",
            created_at=now_str,
            updated_at=now_str
        )
        manifest[doc_id] = doc_record.dict()
        self._save_manifest(manifest, workspace_id, clean_brand)

        try:
            # 3. Save raw file to persistent storage abstraction
            saved_path = self.storage.save(workspace_id, clean_brand, filename, file_bytes)

            # Update status to PROCESSING
            manifest[doc_id]["status"] = "PROCESSING"
            manifest[doc_id]["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
            self._save_manifest(manifest, workspace_id, clean_brand)

            # 4. Load all files in workspace/brand files directory and index
            files_dir = self.storage.get_files_dir(workspace_id, clean_brand)
            index_dir = self.storage.get_index_dir(workspace_id, clean_brand)
            llm, embed_model = self._get_llm_and_embed()

            reader = SimpleDirectoryReader(files_dir)
            documents = reader.load_data()

            index = VectorStoreIndex.from_documents(documents, llm=llm, embed_model=embed_model)
            index.storage_context.persist(persist_dir=index_dir)

            # Update status to INDEXED
            manifest[doc_id]["status"] = "INDEXED"
            manifest[doc_id]["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
            self._save_manifest(manifest, workspace_id, clean_brand)

            return {
                "status": "success",
                "document_id": doc_id,
                "workspace_id": workspace_id,
                "brand_id": clean_brand,
                "filename": filename,
                "saved_path": saved_path,
                "total_documents_indexed": len(documents),
                "record": manifest[doc_id]
            }

        except Exception as err:
            # Atomic cleanup on indexing failure
            manifest[doc_id]["status"] = "FAILED"
            manifest[doc_id]["error_message"] = str(err)
            manifest[doc_id]["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
            self._save_manifest(manifest, workspace_id, clean_brand)
            raise StorageError(f"Failed to process and index document '{filename}': {err}")

    def query_knowledge(
        self,
        query_text: str,
        workspace_id: str = "default",
        brand_id: Optional[str] = "default"
    ) -> Dict:
        clean_brand = brand_id or "default"
        files_dir = self.storage.get_files_dir(workspace_id, clean_brand)
        index_dir = self.storage.get_index_dir(workspace_id, clean_brand)
        llm, embed_model = self._get_llm_and_embed()

        index = None
        if os.path.exists(index_dir) and os.listdir(index_dir):
            try:
                storage_context = StorageContext.from_defaults(persist_dir=index_dir)
                index = load_index_from_storage(storage_context, llm=llm, embed_model=embed_model)
            except Exception as e:
                print(f"Notice: Corrupted or outdated vector store index for workspace '{workspace_id}': {e}. Rebuilding...")

        if not index and os.path.exists(files_dir) and os.listdir(files_dir):
            reader = SimpleDirectoryReader(files_dir)
            documents = reader.load_data()
            index = VectorStoreIndex.from_documents(documents, llm=llm, embed_model=embed_model)
            index.storage_context.persist(persist_dir=index_dir)

        if not index:
            return {
                "status": "empty",
                "workspace_id": workspace_id,
                "brand_id": clean_brand,
                "answer": "Belum ada dokumen brand knowledge yang diunggah untuk workspace dan brand ini.",
                "sources": []
            }

        query_engine = index.as_query_engine(llm=llm)
        response = query_engine.query(query_text)

        source_provenance = []
        if hasattr(response, "source_nodes") and response.source_nodes:
            for idx, node in enumerate(response.source_nodes, start=1):
                snippet = node.node.get_content()[:300] if hasattr(node, "node") else str(node)[:300]
                metadata = getattr(node.node, "metadata", {}) if hasattr(node, "node") else {}
                source_filename = metadata.get("file_name", "brand_document")
                
                source_provenance.append(ProvenanceSource(
                    document_id=metadata.get("document_id", f"chunk_{idx}"),
                    filename=source_filename,
                    source_type=source_filename.split(".")[-1].lower() if "." in source_filename else "document",
                    chunk_id=getattr(node.node, "node_id", f"node_{idx}"),
                    score=float(getattr(node, "score", 0.9)),
                    content_snippet=snippet
                ).dict())

        return {
            "status": "success",
            "workspace_id": workspace_id,
            "brand_id": clean_brand,
            "query": query_text,
            "answer": str(response),
            "sources": source_provenance
        }

    def list_documents(self, workspace_id: str = "default", brand_id: Optional[str] = "default") -> List[Dict]:
        clean_brand = brand_id or "default"
        manifest = self._load_manifest(workspace_id, clean_brand)
        return list(manifest.values())

    def delete_document(self, document_id: str, workspace_id: str = "default", brand_id: Optional[str] = "default") -> bool:
        clean_brand = brand_id or "default"
        manifest = self._load_manifest(workspace_id, clean_brand)

        if document_id not in manifest:
            return False

        doc_rec = manifest[document_id]
        filename = doc_rec.get("filename")
        if filename:
            self.storage.delete(workspace_id, clean_brand, filename)

        del manifest[document_id]
        self._save_manifest(manifest, workspace_id, clean_brand)

        # Re-index remaining files in workspace/brand scope
        files_dir = self.storage.get_files_dir(workspace_id, clean_brand)
        index_dir = self.storage.get_index_dir(workspace_id, clean_brand)
        llm, embed_model = self._get_llm_and_embed()

        if os.path.exists(files_dir) and os.listdir(files_dir):
            reader = SimpleDirectoryReader(files_dir)
            documents = reader.load_data()
            index = VectorStoreIndex.from_documents(documents, llm=llm, embed_model=embed_model)
            index.storage_context.persist(persist_dir=index_dir)
        else:
            # Clean up empty index directory files
            if os.path.exists(index_dir):
                for fname in os.listdir(index_dir):
                    os.remove(os.path.join(index_dir, fname))

        return True
