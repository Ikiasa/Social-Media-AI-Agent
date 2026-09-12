import sys
import os
import unittest

# Add parent dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langgraph_pipeline import (
    content_graph, node_retrieve_knowledge, should_revise,
    run_langgraph_content_pipeline,
    image_prompt_graph, should_refine_image_prompt,
    run_langgraph_image_prompt_pipeline
)
from langgraph.graph import END


class TestLangGraphPipeline(unittest.TestCase):
    def test_01_graph_compilation_and_nodes(self):
        # Verify graph node names
        nodes = list(content_graph.nodes.keys())
        self.assertIn("node_retrieve_knowledge", nodes)
        self.assertIn("node_write_content", nodes)
        self.assertIn("node_qc_evaluate", nodes)
        self.assertIn("node_format_approval", nodes)

    def test_02_should_revise_conditional_routing(self):
        # Test Case A: QC score < 8.0 and revision_count = 0 -> Must trigger revision loop
        state_unapproved = {
            "status": "REVIEWING",
            "revision_count": 0,
            "qc_review": {"score": 6.5, "is_approved": False, "feedback": "Needs stronger hook"}
        }
        next_node_a = should_revise(state_unapproved)
        self.assertEqual(next_node_a, "node_write_content")

        # Test Case B: QC score < 8.0 but max retries reached (revision_count = 2) -> Must proceed to approval
        state_max_retries = {
            "status": "REVIEWING",
            "revision_count": 2,
            "qc_review": {"score": 7.5, "is_approved": False, "feedback": "Acceptable after 2 retries"}
        }
        next_node_b = should_revise(state_max_retries)
        self.assertEqual(next_node_b, "node_format_approval")

        # Test Case C: QC score >= 8.0 (is_approved = True) -> Must proceed to approval
        state_approved = {
            "status": "REVIEWING",
            "revision_count": 0,
            "qc_review": {"score": 9.2, "is_approved": True, "feedback": "Excellent brand alignment"}
        }
        next_node_c = should_revise(state_approved)
        self.assertEqual(next_node_c, "node_format_approval")

        # Test Case D: Status is FAILED -> Must terminate at END
        state_failed = {"status": "FAILED"}
        next_node_d = should_revise(state_failed)
        self.assertEqual(next_node_d, END)

    def test_03_node_retrieve_knowledge_execution(self):
        state = {
            "workspace_id": "test_ws_lg",
            "brand_id": "test_br_lg",
            "topic": "AI Social Agent Automation"
        }
        res = node_retrieve_knowledge(state)
        self.assertEqual(res["status"], "DRAFTING")
        self.assertIn("brand_knowledge", res)

    def test_04_missing_api_key_honest_failure(self):
        key_bak = os.environ.pop("GEMINI_API_KEY", None)
        old_google = os.environ.pop("GOOGLE_API_KEY", None)
        try:
            import langgraph_pipeline
            langgraph_pipeline.api_key = ""
            res = run_langgraph_content_pipeline(
                topic="AI Workflow Test",
                workspace_id="ws_test",
                brand_id="br_test"
            )
            self.assertEqual(res["status"], "FAILED")
            self.assertIsNotNone(res.get("error"))
            self.assertIn("GEMINI_API_KEY", res["error"])
        finally:
            if key_bak:
                os.environ["GEMINI_API_KEY"] = key_bak
            if old_google:
                os.environ["GOOGLE_API_KEY"] = old_google
            import langgraph_pipeline
            langgraph_pipeline.api_key = key_bak or old_google or ""

    def test_05_image_prompt_graph_compilation(self):
        nodes = list(image_prompt_graph.nodes.keys())
        self.assertIn("node_fetch_visual_brand_identity", nodes)
        self.assertIn("node_craft_image_prompt", nodes)
        self.assertIn("node_eval_image_prompt", nodes)
        self.assertIn("node_finalize_image_spec", nodes)

    def test_06_should_refine_image_prompt_conditional_routing(self):
        # Case A: score < 8.0 and retries < 2 -> loops back to node_craft_image_prompt
        state_unapproved = {
            "status": "EVALUATING",
            "revision_count": 0,
            "qc_eval": {"score": 6.8, "is_approved": False}
        }
        self.assertEqual(should_refine_image_prompt(state_unapproved), "node_craft_image_prompt")

        # Case B: score < 8.0 but revision_count == 2 -> proceeds to node_finalize_image_spec
        state_max_retries = {
            "status": "EVALUATING",
            "revision_count": 2,
            "qc_eval": {"score": 7.5, "is_approved": False}
        }
        self.assertEqual(should_refine_image_prompt(state_max_retries), "node_finalize_image_spec")

        # Case C: score >= 8.0 -> proceeds to node_finalize_image_spec
        state_approved = {
            "status": "EVALUATING",
            "revision_count": 0,
            "qc_eval": {"score": 9.0, "is_approved": True}
        }
        self.assertEqual(should_refine_image_prompt(state_approved), "node_finalize_image_spec")

    def test_07_image_prompt_missing_api_key_honest_failure(self):
        key_bak = os.environ.pop("GEMINI_API_KEY", None)
        old_google = os.environ.pop("GOOGLE_API_KEY", None)
        try:
            import langgraph_pipeline
            langgraph_pipeline.api_key = ""
            res = run_langgraph_image_prompt_pipeline(
                topic="Minimalist Packaging Launch",
                workspace_id="ws_img_test",
                brand_id="br_img_test"
            )
            self.assertEqual(res["status"], "FAILED")
            self.assertIsNotNone(res.get("error"))
            self.assertIn("GEMINI_API_KEY", res["error"])
        finally:
            if key_bak:
                os.environ["GEMINI_API_KEY"] = key_bak
            if old_google:
                os.environ["GOOGLE_API_KEY"] = old_google
            import langgraph_pipeline
            langgraph_pipeline.api_key = key_bak or old_google or ""


if __name__ == "__main__":
    unittest.main()

