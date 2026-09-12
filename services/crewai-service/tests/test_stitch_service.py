import unittest
from unittest.mock import patch, MagicMock
from stitch_service import StitchDataClient

class TestStitchDataClient(unittest.TestCase):

    def test_unconfigured_client_skips(self):
        client = StitchDataClient(client_id="")
        self.assertFalse(client.is_configured())
        res = client.push_records("test_table", ["id"], [{"id": "1", "val": "abc"}])
        self.assertEqual(res["status"], "skipped")

    @patch("requests.post")
    def test_push_records_success(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.text = '{"status": "ok"}'
        mock_resp.json.return_value = {"status": "ok"}
        mock_post.return_value = mock_resp

        client = StitchDataClient(client_id="test_token_123")
        self.assertTrue(client.is_configured())

        res = client.push_records("instagram_posts", ["id"], [{"id": "post_1", "caption": "Hello world"}])
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["pushed_count"], 1)

        # Verify request headers and URL
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "https://connect.stitchdata.com/v2/import")
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer test_token_123")

if __name__ == "__main__":
    unittest.main()
