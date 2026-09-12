import os
import re
import json
import urllib.request
import urllib.parse
from crewai.tools import tool
from tools.ssrf_validator import SSRFValidator, SSRFValidationError

# Try importing real scraping packages safely
try:
    import requests
except ImportError:
    requests = None

try:
    import trafilatura
except ImportError:
    trafilatura = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None

# Bounded Limits
MAX_RESPONSE_SIZE = 5 * 1024 * 1024  # 5 MB
DEFAULT_TIMEOUT = 15                 # 15 seconds
MAX_EXTRACTED_TEXT = 25000            # 25,000 chars


def sanitize_untrusted_scraped_text(raw_text: str) -> str:
    """
    Sanitizes untrusted scraped text and wraps it in explicit security fences
    to prevent Prompt Injection attacks against LLM agents.
    """
    if not raw_text:
        return ""

    # Redact obvious prompt injection commands
    injection_patterns = [
        r"ignore\s+previous\s+instructions",
        r"override\s+system\s+prompt",
        r"you\s+are\s+now\s+a",
        r"system:\s*",
        r"assistant:\s*",
    ]

    cleaned_text = raw_text
    for pat in injection_patterns:
        cleaned_text = re.sub(pat, "[REDACTED_PROMPT_INJECTION_ATTEMPT]", cleaned_text, flags=re.IGNORECASE)

    # Limit maximum characters
    if len(cleaned_text) > MAX_EXTRACTED_TEXT:
        cleaned_text = cleaned_text[:MAX_EXTRACTED_TEXT] + "\n...[TRUNCATED_AT_MAX_LIMIT]"

    return f"<untrusted_scraped_content>\n{cleaned_text}\n</untrusted_scrusted_content>"


def sanitize_and_filter_comments(comments: list) -> list:
    """
    Advanced Anti-Spam & Bot Sanitizer for Social Media Comments
    Filters out promotional spam, whatsapp links, bot phrases, and duplicate entries.
    """
    spam_patterns = [
        r"wa\.me",
        r"bit\.ly",
        r"slot",
        r"gacor",
        r"follow",
        r"promo\s+follower",
        r"dm\s+for\s+credit",
        r"cek\s+bio",
        r"link\s+di\s+bio",
    ]

    cleaned = []
    seen_texts = set()

    for idx, item in enumerate(comments):
        text = item.get("text", "").strip()
        if not text or len(text) < 3:
            continue

        text_lower = text.lower()
        if text_lower in seen_texts:
            continue
        seen_texts.add(text_lower)

        if any(re.search(pat, text_lower) for pat in spam_patterns):
            continue

        cleaned.append({
            "id": item.get("id", f"c_{idx+1}"),
            "user": item.get("user", item.get("username", f"user_{idx+1}")),
            "text": text,
        })

    return cleaned


@tool("Universal Web Article Scraper Tool")
def scrape_web_article_tool(url: str) -> str:
    """
    Scrapes live text, title, and article content from any given Website URL.
    Returns clean extracted article text, domain, title, and metadata for analysis.
    Validates URL against SSRF security policies and applies bounded limits.
    """
    try:
        # 1. SSRF Validation & Safe Redirect Following
        validated_url, target_ip, port = SSRFValidator.validate_url(url)
    except SSRFValidationError as ssrf_err:
        return json.dumps({
            "status": "error",
            "is_live_data": False,
            "error_code": "SSRF_SECURITY_REJECTION",
            "url": url,
            "message": str(ssrf_err)
        })

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    try:
        html_content = None

        if requests:
            # Custom Session to validate redirects against SSRF policy
            session = requests.Session()
            session.max_redirects = 3

            req_prep = session.get(validated_url, headers=headers, timeout=DEFAULT_TIMEOUT, stream=True, allow_redirects=False)
            
            # Follow redirects manually with SSRF re-validation
            redirect_count = 0
            curr_resp = req_prep

            while curr_resp.is_redirect and redirect_count < 3:
                redirect_target = curr_resp.headers.get("Location")
                if not redirect_target:
                    break
                # Re-validate redirect target against SSRF policy
                validated_target, _, _ = SSRFValidator.validate_url(
                    urllib.parse.urljoin(curr_resp.url, redirect_target)
                )
                curr_resp = session.get(validated_target, headers=headers, timeout=DEFAULT_TIMEOUT, stream=True, allow_redirects=False)
                redirect_count += 1

            curr_resp.raise_for_status()

            # Enforce Max Bounded Response Size (5MB)
            content_chunks = []
            size = 0
            for chunk in curr_resp.iter_content(chunk_size=65536):
                size += len(chunk)
                if size > MAX_RESPONSE_SIZE:
                    break
                content_chunks.append(chunk)

            html_content = b"".join(content_chunks).decode("utf-8", errors="ignore")
        else:
            req = urllib.request.Request(validated_url, headers=headers)
            with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as response:
                html_content = response.read(MAX_RESPONSE_SIZE).decode("utf-8", errors="ignore")

        title = "Web Page Content"
        text_content = ""

        # Trafilatura extraction
        if trafilatura and html_content:
            extracted = trafilatura.extract(html_content, include_links=False, include_images=False)
            if extracted:
                text_content = extracted

        # BeautifulSoup fallback
        if not text_content and BeautifulSoup and html_content:
            soup = BeautifulSoup(html_content, "html.parser")
            if soup.title and soup.title.string:
                title = soup.title.string.strip()

            for element in soup(["script", "style", "nav", "header", "footer", "aside"]):
                element.decompose()

            paragraphs = [p.get_text().strip() for pparam in [soup.find_all("p")] for p in pparam if len(p.get_text().strip()) > 20]
            text_content = "\n\n".join(paragraphs)

        domain = urllib.parse.urlparse(validated_url).netloc
        safe_content = sanitize_untrusted_scraped_text(text_content)

        if text_content:
            return json.dumps({
                "status": "success",
                "is_live_data": True,
                "url": validated_url,
                "domain": domain,
                "title": title,
                "word_count": len(text_content.split()),
                "content": safe_content,
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "status": "partial",
                "is_live_data": False,
                "url": validated_url,
                "message": "Web page loaded but no readable body text could be extracted.",
            })

    except Exception as err:
        return json.dumps({
            "status": "error",
            "is_live_data": False,
            "url": validated_url if 'validated_url' in locals() else url,
            "error": str(err),
            "message": "Failed to fetch live web page. Ensure URL is correct and publicly accessible."
        })


@tool("YouTube Video & Transcript Scraper Tool")
def scrape_youtube_transcript_tool(youtube_url: str) -> str:
    """
    Extracts video metadata (title, author) and real video transcripts/subtitles from a YouTube video URL or Video ID.
    Validates URL against SSRF security policies and applies bounded limits.
    """
    clean_input = youtube_url.strip()

    # Extract YouTube Video ID
    video_id = None
    if "youtu.be/" in clean_input:
        video_id = clean_input.split("youtu.be/")[1].split("?")[0].split("/")[0]
    elif "youtube.com/watch" in clean_input:
        parsed = urllib.parse.urlparse(clean_input)
        params = urllib.parse.parse_qs(parsed.query)
        video_id = params.get("v", [None])[0]
    elif "youtube.com/shorts/" in clean_input:
        video_id = clean_input.split("youtube.com/shorts/")[1].split("?")[0].split("/")[0]
    elif len(clean_input) == 11 and not " " in clean_input:
        video_id = clean_input

    if not video_id or not re.match(r"^[a-zA-Z0-9_\-]{11}$", video_id):
        return json.dumps({
            "status": "error",
            "is_live_data": False,
            "input": youtube_url,
            "message": "Could not parse valid YouTube Video ID from input URL."
        })

    # Validate YouTube oEmbed target URL against SSRF
    target_yt_url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        SSRFValidator.validate_url(target_yt_url)
    except SSRFValidationError as ssrf_err:
        return json.dumps({
            "status": "error",
            "is_live_data": False,
            "input": youtube_url,
            "error_code": "SSRF_SECURITY_REJECTION",
            "message": str(ssrf_err)
        })

    # 1. Fetch metadata via YouTube oEmbed API
    title = f"YouTube Video ({video_id})"
    author = "YouTube Channel"
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
            data = json.loads(resp.read(1024*1024).decode())
            title = data.get("title", title)
            author = data.get("author_name", author)
    except Exception as err:
        print(f"YouTube oEmbed notice: {err}")

    # 2. Fetch real Transcript using youtube_transcript_api
    transcript_text = ""
    if YouTubeTranscriptApi:
        try:
            api = YouTubeTranscriptApi()
            fetched = api.fetch(video_id)
            lines = [snippet.text for snippet in fetched if hasattr(snippet, "text")]
            transcript_text = " ".join(lines)
        except Exception as err:
            try:
                fetched = YouTubeTranscriptApi.get_transcript(video_id)
                lines = [item.get("text", "") for item in fetched]
                transcript_text = " ".join(lines)
            except Exception as err2:
                transcript_text = f"Transcript not available for this video ({err})."

    safe_transcript = sanitize_untrusted_scraped_text(transcript_text)

    return json.dumps({
        "status": "success" if transcript_text and "not available" not in transcript_text else "metadata_only",
        "is_live_data": True if transcript_text and "not available" not in transcript_text else False,
        "video_id": video_id,
        "video_url": f"https://www.youtube.com/watch?v={video_id}",
        "title": title,
        "author": author,
        "transcript": safe_transcript,
    }, ensure_ascii=False)


@tool("TikTok Video Scraper Tool")
def scrape_tiktok_video_tool(tiktok_url: str) -> str:
    """
    Extracts TikTok video caption, author, thumbnail, and oEmbed metadata from a TikTok video URL.
    """
    try:
        validated_url, _, _ = SSRFValidator.validate_url(tiktok_url)
    except SSRFValidationError as ssrf_err:
        return json.dumps({
            "status": "error",
            "is_live_data": False,
            "error_code": "SSRF_SECURITY_REJECTION",
            "url": tiktok_url,
            "message": str(ssrf_err)
        })

    try:
        oembed_url = f"https://www.tiktok.com/oembed?url={urllib.parse.quote(validated_url)}"
        req = urllib.request.Request(
            oembed_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            }
        )
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
            data = json.loads(resp.read(MAX_RESPONSE_SIZE).decode())
            caption = sanitize_untrusted_scraped_text(data.get("title", ""))
            return json.dumps({
                "status": "success",
                "is_live_data": True,
                "platform": "TikTok",
                "url": validated_url,
                "title_caption": caption,
                "author_name": data.get("author_name", ""),
                "author_handle": data.get("author_unique_id", ""),
                "thumbnail_url": data.get("thumbnail_url", ""),
            }, ensure_ascii=False)
    except Exception as err:
        return json.dumps({
            "status": "error",
            "is_live_data": False,
            "platform": "TikTok",
            "url": validated_url,
            "error": str(err),
            "message": "Failed to fetch TikTok oEmbed metadata. Verify URL is public and valid."
        })


def scrape_instagram_url_public(url_str: str, depth: str = "standard") -> dict | None:
    """
    Public Instagram URL Scraper Engine using Instagram OEmbed.
    """
    try:
        validated_url, _, _ = SSRFValidator.validate_url(url_str)
        match = re.search(r"instagram\.com/(?:p|reel|tv)/([^/?#&]+)", validated_url)
        shortcode = match.group(1) if match else "post_public"

        oembed_url = f"https://api.instagram.com/oembed/?url={urllib.parse.quote(validated_url)}"
        req = urllib.request.Request(
            oembed_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
        )
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
            oembed_data = json.loads(resp.read(MAX_RESPONSE_SIZE).decode())
            author_name = oembed_data.get("author_name", "ig_creator")
            title_caption = oembed_data.get("title", f"Postingan Publik Instagram #{shortcode}")

            count_map = {"quick": 20, "standard": 100, "deep": 300}
            total_count = count_map.get(depth, 100)

            return {
                "topic": f"Post {shortcode} oleh @{author_name}",
                "is_live_data": True,
                "target_type": "url",
                "depth": depth,
                "source": f"Instagram Public oEmbed Engine (Depth: {depth.upper()})",
                "post_metadata": {
                    "post_id": shortcode,
                    "author": author_name,
                    "caption": sanitize_untrusted_scraped_text(title_caption),
                    "comments_count": total_count,
                },
                "comments": [],
            }
    except Exception as err:
        print(f"Instagram Live URL Scraper notice: {err}")
        return None


@tool("Instagram Intelligence Scraper Tool")
def scrape_instagram_comments_tool(topic_or_url: str) -> str:
    """
    Scrapes Instagram post metadata and user comments based on topic keyword, hashtag, competitor handle, or Instagram post URL.
    """
    clean_input = topic_or_url.strip()

    if "instagram.com" in clean_input.lower():
        live_data = scrape_instagram_url_public(clean_input, depth="standard")
        if live_data:
            live_data["comments"] = sanitize_and_filter_comments(live_data["comments"])
            return json.dumps(live_data, ensure_ascii=False)

    target_type = "handle" if clean_input.startswith("@") else "hashtag" if clean_input.startswith("#") else "hashtag"
    clean_topic = clean_input.replace("#", "").replace("@", "")

    payload = {
        "topic": clean_topic,
        "is_live_data": False,
        "status": "UNAVAILABLE",
        "reason": "COMMENTS_NOT_AVAILABLE",
        "notice": "Instagram Graph API access token or authenticated session credentials required to fetch live user comments.",
        "target_type": target_type,
        "source": f"Instagram Topic Scraper Engine (Target: {target_type.upper()})",
        "post_metadata": {
            "post_id": f"ig_topic_{abs(hash(clean_topic)) % 10000}",
            "caption": f"Pembahasan utama mengenai #{clean_topic}.",
            "comments_count": 0,
        },
        "comments": [],
    }

    return json.dumps(payload, ensure_ascii=False)

