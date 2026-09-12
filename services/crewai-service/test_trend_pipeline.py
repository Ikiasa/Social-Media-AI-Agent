import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from crew_trend import run_trend_to_content_pipeline

def test_trend_pipeline():
    print("=== Testing Feature #3: Trend-to-Content Pipeline ===")
    
    test_urls = [
        "https://en.wikipedia.org/wiki/Artificial_intelligence",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    ]
    target_brand = "Agensi Digital Kreatif"
    
    print(f"Analyzing {len(test_urls)} trend URLs for brand '{target_brand}'...")
    result = run_trend_to_content_pipeline(urls=test_urls, target_brand=target_brand, count=2)
    
    print("\n--- Pipeline Execution Result ---")
    print(f"Target Brand: {result.target_brand}")
    print(f"Source Count: {result.source_count}")
    print(f"Topic Summary: {result.topic_summary}")
    print(f"Generated Posts Count: {len(result.generated_posts)}")
    
    for idx, post in enumerate(result.generated_posts, start=1):
        print(f"\n[Post #{idx}]")
        print(f"Format: {post.content_format}")
        print(f"Hook: {post.headline_hook}")
        print(f"Takeaway: {post.core_takeaway[:80]}...")
        print(f"Caption Snippet: {post.caption[:100]}...")
        print(f"Hashtags: {' '.join(post.hashtags)}")
        print(f"Image Prompt: {post.image_prompt[:80]}...")

if __name__ == "__main__":
    test_trend_pipeline()
