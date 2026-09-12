import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from knowledge_service import KnowledgeManager

def test_knowledge_upload_and_query():
    print("=== Testing Feature #1: Brand Knowledge Ingestion & Querying ===")
    
    km = KnowledgeManager()
    workspace_id = "test-agency-workspace"
    
    # 1. Create sample brand guideline document bytes
    sample_content = (
        "PANDUAN BRAND VOICE & KOMUNIKASI AGENT MARKETING\n\n"
        "1. Tone of Voice: Ramah, Profesional, Edukatif, dan penuh semangat.\n"
        "2. Panggilan Audiens: Gunakan panggilan 'Sobat Marketing' atau 'Kawan Kreatif'.\n"
        "3. Istilah Terlarang: Hindari kata 'murahan', 'pasti kaya', 'pasti viral'. Gunakan istilah 'terjangkau', 'terbukti', 'berpotensi tinggi'.\n"
        "4. Garansi Layanan: Garansi revisi hingga 3 kali untuk seluruh paket pembuatan konten sosial media.\n"
    ).encode("utf-8")
    
    filename = "brand_guidelines_2026.txt"
    print(f"Uploading file '{filename}' to workspace '{workspace_id}'...")
    
    upload_res = km.save_and_index_file(
        file_bytes=sample_content,
        filename=filename,
        workspace_id=workspace_id
    )
    print("Upload Result:", json.dumps(upload_res, indent=2))
    
    # 2. Query Knowledge Base
    query_text = "Apa panggilan audiens yang harus digunakan dan bagaimana aturan garansi layanan?"
    print(f"\nQuerying Knowledge Base: '{query_text}'...")
    
    query_res = km.query_knowledge(query_text=query_text, workspace_id=workspace_id)
    print("Query Answer:\n", query_res.get("answer"))

if __name__ == "__main__":
    test_knowledge_upload_and_query()
