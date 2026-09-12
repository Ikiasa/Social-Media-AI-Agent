import json
import sys

# Ensure UTF-8 output encoding for Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from tools.scraper_tool import (
    scrape_web_article_tool,
    scrape_youtube_transcript_tool,
    scrape_tiktok_video_tool,
    scrape_instagram_comments_tool
)

def test_web_scraper():
    print("\n--- 1. Testing Real Web Article Scraper ---")
    target_url = "https://en.wikipedia.org/wiki/Artificial_intelligence"
    result_json = scrape_web_article_tool.run(url=target_url)
    data = json.loads(result_json)
    print(f"Status: {data.get('status')}")
    print(f"Is Live Data: {data.get('is_live_data')}")
    print(f"Title: {data.get('title')}")
    print(f"Word Count: {data.get('word_count')}")
    print(f"Content Snippet: {data.get('content', '')[:150]}...")

def test_youtube_scraper():
    print("\n--- 2. Testing Real YouTube Transcript Scraper ---")
    # Public YouTube video
    yt_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    result_json = scrape_youtube_transcript_tool.run(youtube_url=yt_url)
    data = json.loads(result_json)
    print(f"Status: {data.get('status')}")
    print(f"Is Live Data: {data.get('is_live_data')}")
    print(f"Title: {data.get('title')}")
    print(f"Author: {data.get('author')}")
    print(f"Transcript Snippet: {data.get('transcript', '')[:150]}...")

def test_tiktok_scraper():
    print("\n--- 3. Testing TikTok oEmbed Scraper ---")
    # Sample public TikTok link
    tiktok_url = "https://www.tiktok.com/@tiktok/video/7106594312292453678"
    result_json = scrape_tiktok_video_tool.run(tiktok_url=tiktok_url)
    data = json.loads(result_json)
    print(f"Status: {data.get('status')}")
    print(f"Title/Caption: {data.get('title_caption')}")

def test_instagram_scraper():
    print("\n--- 4. Testing Instagram Scraper ---")
    ig_input = "#digitalmarketing"
    result_json = scrape_instagram_comments_tool.run(topic_or_url=ig_input)
    data = json.loads(result_json)
    print(f"Is Live Data: {data.get('is_live_data')}")
    print(f"Topic: {data.get('topic')}")

if __name__ == "__main__":
    print("=== Starting Real Scraper Tool Tests ===")
    test_web_scraper()
    test_youtube_scraper()
    test_tiktok_scraper()
    test_instagram_scraper()
    print("\n=== Scraper Tests Completed ===")
