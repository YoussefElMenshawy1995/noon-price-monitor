"""Configuration for the Noon Minutes Price Monitor scraper."""

import os

# Supabase
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Concurrency limits per competitor
AMAZON_CONCURRENCY = 5
NINJA_CONCURRENCY = 15
LULU_CONCURRENCY = 5

# Delay between requests (seconds)
AMAZON_DELAY_MIN = 2.0
AMAZON_DELAY_MAX = 5.0
NINJA_DELAY_MIN = 0.5
NINJA_DELAY_MAX = 1.5
LULU_DELAY_MIN = 1.0
LULU_DELAY_MAX = 3.0

# Request timeout (seconds)
REQUEST_TIMEOUT = 30

# Batch size for DB upserts
DB_BATCH_SIZE = 500

# Alert thresholds
PRICE_CHANGE_THRESHOLD_PCT = 5.0  # Only alert on changes > 5%

# User-Agent rotation pool
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

# Common headers for browser-like requests
BASE_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}
