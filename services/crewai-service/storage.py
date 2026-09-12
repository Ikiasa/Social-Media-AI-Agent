import os
import re
from abc import ABC, abstractmethod
from typing import Optional, List, Dict


class StorageError(Exception):
    """Base exception for Knowledge Storage errors."""
    pass


class KnowledgeStorage(ABC):
    @abstractmethod
    def save(self, workspace_id: str, brand_id: Optional[str], filename: str, content_bytes: bytes) -> str:
        """Saves content bytes to storage and returns relative file path."""
        pass

    @abstractmethod
    def read(self, workspace_id: str, brand_id: Optional[str], filename: str) -> bytes:
        """Reads content bytes from storage."""
        pass

    @abstractmethod
    def delete(self, workspace_id: str, brand_id: Optional[str], filename: str) -> bool:
        """Deletes file from storage."""
        pass

    @abstractmethod
    def exists(self, workspace_id: str, brand_id: Optional[str], filename: str) -> bool:
        """Checks if file exists in storage."""
        pass

    @abstractmethod
    def get_files_dir(self, workspace_id: str, brand_id: Optional[str]) -> str:
        """Returns physical files directory path."""
        pass

    @abstractmethod
    def get_index_dir(self, workspace_id: str, brand_id: Optional[str]) -> str:
        """Returns physical vector index directory path."""
        pass


class FileKnowledgeStorage(KnowledgeStorage):
    def __init__(self, base_storage_path: Optional[str] = None):
        if not base_storage_path:
            base_storage_path = os.getenv("RIONA_KNOWLEDGE_STORAGE_PATH", "./data/knowledge")
        self.base_storage_path = os.path.abspath(base_storage_path)
        os.makedirs(self.base_storage_path, exist_ok=True)

    def _sanitize_segment(self, segment: Optional[str], default: str = "default") -> str:
        if not segment:
            return default
        clean = re.sub(r"[^a-zA-Z0-9_\-]", "", str(segment)).strip()
        return clean if clean else default

    def get_files_dir(self, workspace_id: str, brand_id: Optional[str] = None) -> str:
        clean_ws = self._sanitize_segment(workspace_id, "default")
        clean_brand = self._sanitize_segment(brand_id, "default")
        files_dir = os.path.join(self.base_storage_path, clean_ws, clean_brand, "files")
        os.makedirs(files_dir, exist_ok=True)
        return files_dir

    def get_index_dir(self, workspace_id: str, brand_id: Optional[str] = None) -> str:
        clean_ws = self._sanitize_segment(workspace_id, "default")
        clean_brand = self._sanitize_segment(brand_id, "default")
        index_dir = os.path.join(self.base_storage_path, clean_ws, clean_brand, "index")
        os.makedirs(index_dir, exist_ok=True)
        return index_dir

    def _get_file_path(self, workspace_id: str, brand_id: Optional[str], filename: str) -> str:
        files_dir = self.get_files_dir(workspace_id, brand_id)
        clean_filename = os.path.basename(filename)  # Strip directory paths
        if not clean_filename or clean_filename in (".", ".."):
            raise StorageError("Invalid filename provided.")
        return os.path.join(files_dir, clean_filename)

    def save(self, workspace_id: str, brand_id: Optional[str], filename: str, content_bytes: bytes) -> str:
        file_path = self._get_file_path(workspace_id, brand_id, filename)
        with open(file_path, "wb") as f:
            f.write(content_bytes)
        return file_path

    def read(self, workspace_id: str, brand_id: Optional[str], filename: str) -> bytes:
        file_path = self._get_file_path(workspace_id, brand_id, filename)
        if not os.path.exists(file_path):
            raise StorageError(f"File '{filename}' not found in workspace '{workspace_id}'.")
        with open(file_path, "rb") as f:
            return f.read()

    def delete(self, workspace_id: str, brand_id: Optional[str], filename: str) -> bool:
        file_path = self._get_file_path(workspace_id, brand_id, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False

    def exists(self, workspace_id: str, brand_id: Optional[str], filename: str) -> bool:
        file_path = self._get_file_path(workspace_id, brand_id, filename)
        return os.path.exists(file_path)


class JobStorage(ABC):
    @abstractmethod
    def save_job(self, job_id: str, data: Dict) -> None:
        """Saves job state dict to persistent storage."""
        pass

    @abstractmethod
    def get_job(self, job_id: str) -> Optional[Dict]:
        """Retrieves job state dict from persistent storage."""
        pass


class FileJobStorage(JobStorage):
    def __init__(self, base_jobs_path: Optional[str] = None):
        if not base_jobs_path:
            base_jobs_path = os.getenv("RIONA_JOBS_STORAGE_PATH", "./data/jobs")
        self.base_jobs_path = os.path.abspath(base_jobs_path)
        os.makedirs(self.base_jobs_path, exist_ok=True)

    def _get_job_path(self, job_id: str) -> str:
        clean_id = re.sub(r"[^a-zA-Z0-9_\-]", "", str(job_id)).strip()
        if not clean_id:
            raise StorageError("Invalid job_id provided.")
        return os.path.join(self.base_jobs_path, f"{clean_id}.json")

    def save_job(self, job_id: str, data: Dict) -> None:
        import json
        job_path = self._get_job_path(job_id)
        tmp_path = f"{job_path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        os.replace(tmp_path, job_path)

    def get_job(self, job_id: str) -> Optional[Dict]:
        import json
        job_path = self._get_job_path(job_id)
        if not os.path.exists(job_path):
            return None
        try:
            with open(job_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

