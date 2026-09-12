import sys
import os
import json
import unittest

# Add parent dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crew import create_instagram_analysis_crew
from tools.scraper_tool import scrape_instagram_comments_tool, scrape_instagram_url_public
from crew_trend import run_trend_to_content_pipeline
from tools.llamaindex_tool import get_llama_index, create_brand_knowledge_tool
from storage import FileJobStorage


class TestZeroDummyTruthfulness(unittest.TestCase):
    def test_01_missing_api_key_raises_runtime_error(self):
        # Force invalid key environment
        old_env = os.environ.get("NODE_ENV")
        os.environ["NODE_ENV"] = "production"
        
        # Backup GEMINI_API_KEY
        key_bak = os.environ.pop("GEMINI_API_KEY", None)
        try:
            import crew
            crew.is_valid_key = False
            with self.assertRaises(RuntimeError) as ctx:
                create_instagram_analysis_crew("social media marketing")
            self.assertIn("GEMINI_API_KEY is missing or invalid", str(ctx.exception))
        finally:
            if key_bak:
                os.environ["GEMINI_API_KEY"] = key_bak
            if old_env:
                os.environ["NODE_ENV"] = old_env

    def test_02_instagram_scraper_returns_empty_comments(self):
        # Topic search without credentials
        raw_res = scrape_instagram_comments_tool.run(topic_or_url="digital_strategy")
        res = json.loads(raw_res)
        self.assertEqual(res["status"], "UNAVAILABLE")
        self.assertEqual(res["comments"], [])
        self.assertNotIn("user_sample1", raw_res)
        self.assertNotIn("user_sample2", raw_res)

        # Public oEmbed search
        public_res = scrape_instagram_url_public("https://www.instagram.com/p/C_test123/")
        if public_res:
            self.assertEqual(public_res["comments"], [])
            self.assertNotIn("c_live_101", json.dumps(public_res))

    def test_03_trend_pipeline_zero_sources_returns_no_source(self):
        # Provide invalid / blocked SSRF loopback URLs
        result = run_trend_to_content_pipeline(urls=["http://127.0.0.1/admin"], target_brand="Acme Test")
        self.assertEqual(result.source_count, 0)
        self.assertEqual(result.generated_posts, [])
        self.assertIn("No valid trend source URLs", result.topic_summary)

    def test_04_empty_knowledge_directory_returns_none(self):
        empty_dir = "./data/test_empty_knowledge_dir"
        if os.path.exists(empty_dir):
            import shutil
            shutil.rmtree(empty_dir)
            
        index = get_llama_index(data_dir=empty_dir)
        self.assertIsNone(index)
        
        # Verify brand_guidelines.txt was NOT created
        fake_file = os.path.join(empty_dir, "brand_guidelines.txt")
        self.assertFalse(os.path.exists(fake_file))

    def test_05_file_job_storage_persistence(self):
        js = FileJobStorage(base_jobs_path="./data/test_jobs_dir")
        job_id = "job_test_123"
        data = {
            "status": "failed",
            "result": None,
            "error": {"code": "ANALYSIS_PROVIDER_UNAVAILABLE", "message": "API key missing"}
        }
        js.save_job(job_id, data)
        
        retrieved = js.get_job(job_id)
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved["status"], "failed")
        self.assertEqual(retrieved["error"]["code"], "ANALYSIS_PROVIDER_UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
