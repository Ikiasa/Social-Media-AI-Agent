import sys
import os
import json
import unittest

# Add parent dir to path so tools/storage/knowledge_service can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage import FileKnowledgeStorage, StorageError
from knowledge_service import KnowledgeManager


class TestKnowledgeHardening(unittest.TestCase):
    def setUp(self):
        import shutil
        self.test_storage_dir = "./data/test_knowledge_harden"
        if os.path.exists(self.test_storage_dir):
            shutil.rmtree(self.test_storage_dir)
        self.storage = FileKnowledgeStorage(base_storage_path=self.test_storage_dir)
        self.km = KnowledgeManager(storage=self.storage)
        self.ws_a = "ws_alpha"
        self.ws_b = "ws_beta"
        self.brand_a = "brand_alpha"

    def test_01_storage_crud(self):
        filename = "guidelines.txt"
        content = b"Tone of voice: Friendly and professional."
        
        # Save
        path = self.storage.save(self.ws_a, self.brand_a, filename, content)
        self.assertTrue(os.path.exists(path))
        self.assertTrue(self.storage.exists(self.ws_a, self.brand_a, filename))

        # Read
        read_bytes = self.storage.read(self.ws_a, self.brand_a, filename)
        self.assertEqual(read_bytes, content)

        # Delete
        deleted = self.storage.delete(self.ws_a, self.brand_a, filename)
        self.assertTrue(deleted)
        self.assertFalse(self.storage.exists(self.ws_a, self.brand_a, filename))

    def test_02_upload_and_sha256_duplicate_detection(self):
        filename = "brand_voice.txt"
        content = b"PANDUAN LENGKAP BRAND VOICE 2026. Sobat Marketing harus ceria dan solutif."

        # First Upload
        res1 = self.km.save_and_index_file(content, filename, workspace_id=self.ws_a, brand_id=self.brand_a)
        self.assertEqual(res1["status"], "success")
        self.assertIn("document_id", res1)

        # Duplicate Upload (identical bytes)
        res2 = self.km.save_and_index_file(content, filename, workspace_id=self.ws_a, brand_id=self.brand_a)
        self.assertEqual(res2["status"], "duplicate")

    def test_03_tenant_workspace_isolation(self):
        filename = "secret_formula.txt"
        content_a = b"FORMULA DOKUMEN WORKSPACE A: Rahasia sukses branding adalah konsistensi warna biru #0033FF."

        # Workspace A uploads knowledge
        self.km.save_and_index_file(content_a, filename, workspace_id=self.ws_a, brand_id=self.brand_a)

        # Workspace B queries knowledge
        query_text = "Apa rahasia warna branding?"
        res_b = self.km.query_knowledge(query_text, workspace_id=self.ws_b, brand_id="default")

        # Workspace B must NOT receive Workspace A's knowledge
        self.assertEqual(res_b["status"], "empty")
        self.assertIn("Belum ada dokumen", res_b["answer"])

    def test_04_rag_provenance_retrieval(self):
        filename = "sop_layanan.txt"
        content = b"SOP LAYANAN A: Garansi revisi gratis maksimal 3 kali untuk seluruh paket sosial media."

        self.km.save_and_index_file(content, filename, workspace_id=self.ws_a, brand_id=self.brand_a)

        res = self.km.query_knowledge("Berapa garansi revisi?", workspace_id=self.ws_a, brand_id=self.brand_a)
        self.assertEqual(res["status"], "success")
        self.assertIn("sources", res)
        self.assertTrue(len(res["sources"]) > 0)
        source = res["sources"][0]
        self.assertIn("filename", source)
        self.assertIn("content_snippet", source)


if __name__ == "__main__":
    unittest.main()
