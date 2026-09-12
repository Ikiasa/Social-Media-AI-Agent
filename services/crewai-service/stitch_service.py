import os
import time
import logging
import requests
from typing import List, Dict, Any, Optional

logger = logging.getLogger("stitch-service")

class StitchDataClient:
    """
    Client for Stitch Data Import API v2.
    Allows pushing social media agent metrics, leads, and analysis logs
    directly into Stitch Data pipelines to be loaded into your Data Warehouse.
    """

    DEFAULT_API_URL = "https://connect.stitchdata.com/v2/import"

    def __init__(self, client_id: Optional[str] = None, api_url: Optional[str] = None):
        self.client_id = client_id if client_id is not None else os.getenv("STITCH_CLIENT_ID", "").strip()
        self.api_url = api_url or os.getenv("STITCH_API_URL", self.DEFAULT_API_URL).strip()

    def is_configured(self) -> bool:
        """Check if a valid Stitch client ID is configured."""
        return bool(self.client_id and self.client_id != "your_stitch_client_id_here")

    def push_records(
        self,
        table_name: str,
        key_names: List[str],
        records: List[Dict[str, Any]],
        sequence: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Push batch records to Stitch Import API.

        :param table_name: Destination table name in data warehouse
        :param key_names: List of primary key fields (e.g. ['id'])
        :param records: List of dictionary records to insert/upsert
        :param sequence: Unix epoch timestamp for sequence control (defaults to current time ms)
        :return: API response JSON
        """
        if not self.is_configured():
            logger.warning("StitchDataClient: STITCH_CLIENT_ID is not configured. Skipping push.")
            return {"status": "skipped", "reason": "STITCH_CLIENT_ID missing"}

        if not records:
            return {"status": "success", "message": "No records to push"}

        seq_val = sequence or int(time.time() * 1000)

        # Prepare messages in Stitch Import API format
        messages = []
        for record in records:
            messages.append({
                "action": "upsert",
                "sequence": seq_val,
                "key_names": key_names,
                "data": record
            })

        payload = {
            "table_name": table_name,
            "schema": {
                "properties": {
                    key: {"type": ["string", "null"]} for key in (records[0].keys() if records else [])
                }
            },
            "messages": messages
        }

        headers = {
            "Authorization": f"Bearer {self.client_id}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=15)
            response.raise_for_status()
            logger.info(f"Successfully pushed {len(records)} records to Stitch table '{table_name}'.")
            return {
                "status": "success",
                "table_name": table_name,
                "pushed_count": len(records),
                "response": response.json() if response.text else {}
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Error pushing to Stitch API: {e}")
            return {"status": "error", "error": str(e)}

    def push_analysis_results(self, workspace_id: str, results: Dict[str, Any]) -> Dict[str, Any]:
        """Helper to push Instagram/social media analysis results."""
        record = {
            "id": f"{workspace_id}_{int(time.time())}",
            "workspace_id": workspace_id,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "analysis": str(results.get("analysis", "")),
            "sentiment_summary": str(results.get("sentiment", {})),
            "high_intent_count": len(results.get("high_intent_leads", []))
        }
        return self.push_records("social_media_analysis", ["id"], [record])
