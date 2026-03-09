"""
Base scraper with async HTTP, retries, header rotation, and concurrency control.
All competitor scrapers inherit from this.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import httpx

from config import USER_AGENTS, BASE_HEADERS, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)


@dataclass
class ScrapeResult:
    """Result of scraping a single product page."""

    product_id: int
    competitor: str
    scrape_date: str = field(default_factory=lambda: date.today().isoformat())
    price: float | None = None
    original_price: float | None = None
    discount_pct: float | None = None
    in_stock: bool = True
    availability_text: str | None = None
    delivery_text: str | None = None
    promo_label: str | None = None
    scrape_status: str = "success"

    def to_dict(self) -> dict:
        return {
            "product_id": self.product_id,
            "competitor": self.competitor,
            "scrape_date": self.scrape_date,
            "price": self.price,
            "original_price": self.original_price,
            "discount_pct": self.discount_pct,
            "in_stock": self.in_stock,
            "availability_text": self.availability_text,
            "delivery_text": self.delivery_text,
            "promo_label": self.promo_label,
            "scrape_status": self.scrape_status,
        }


class BaseScraper(ABC):
    """Abstract base class for all competitor scrapers."""

    competitor: str = ""
    concurrency: int = 10
    delay_min: float = 0.5
    delay_max: float = 1.5
    max_retries: int = 2

    def __init__(self):
        self.results: list[ScrapeResult] = []
        self.success_count = 0
        self.failed_count = 0
        self.blocked_count = 0
        self._semaphore: asyncio.Semaphore | None = None

    def _get_headers(self) -> dict[str, str]:
        """Return browser-like headers with a random User-Agent."""
        ua = random.choice(USER_AGENTS)
        headers = {**BASE_HEADERS, "User-Agent": ua}
        return headers

    async def _delay(self) -> None:
        """Random delay between requests."""
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))

    async def _fetch(self, client: httpx.AsyncClient, url: str) -> httpx.Response | None:
        """Fetch a URL with retries."""
        for attempt in range(self.max_retries + 1):
            try:
                resp = await client.get(
                    url,
                    headers=self._get_headers(),
                    timeout=REQUEST_TIMEOUT,
                    follow_redirects=True,
                )
                if resp.status_code == 200:
                    return resp
                elif resp.status_code == 503 or resp.status_code == 429:
                    logger.warning(f"Rate limited ({resp.status_code}) on {url}, attempt {attempt + 1}")
                    await asyncio.sleep(5 * (attempt + 1))
                elif resp.status_code == 404:
                    return resp  # Let the parser handle 404
                else:
                    logger.warning(f"HTTP {resp.status_code} on {url}")
            except (httpx.TimeoutException, httpx.ConnectError, httpx.ReadError) as e:
                logger.warning(f"Request error on {url}: {e}, attempt {attempt + 1}")
                await asyncio.sleep(2 * (attempt + 1))

        return None

    @abstractmethod
    async def parse_product(self, html: str, url: str, product: dict) -> ScrapeResult:
        """Parse a product page HTML and extract price data. Implement per competitor."""
        ...

    def is_blocked(self, html: str) -> bool:
        """Check if the response indicates a CAPTCHA or block. Override per competitor."""
        return False

    async def _scrape_one(self, client: httpx.AsyncClient, product: dict) -> ScrapeResult:
        """Scrape a single product with semaphore control."""
        assert self._semaphore is not None
        url_key = f"{self.competitor}_url"
        url = product.get(url_key, "")
        product_id = product["id"]

        async with self._semaphore:
            await self._delay()
            resp = await self._fetch(client, url)

            if resp is None:
                self.failed_count += 1
                return ScrapeResult(
                    product_id=product_id,
                    competitor=self.competitor,
                    scrape_status="failed",
                )

            if resp.status_code == 404:
                self.failed_count += 1
                return ScrapeResult(
                    product_id=product_id,
                    competitor=self.competitor,
                    scrape_status="not_found",
                    in_stock=False,
                )

            html = resp.text

            if self.is_blocked(html):
                self.blocked_count += 1
                return ScrapeResult(
                    product_id=product_id,
                    competitor=self.competitor,
                    scrape_status="blocked",
                )

            try:
                result = await self.parse_product(html, url, product)
                self.success_count += 1
                return result
            except Exception as e:
                logger.error(f"Parse error for {url}: {e}")
                self.failed_count += 1
                return ScrapeResult(
                    product_id=product_id,
                    competitor=self.competitor,
                    scrape_status="failed",
                )

    async def scrape_all(self, products: list[dict]) -> list[ScrapeResult]:
        """Scrape all products concurrently (bounded by semaphore)."""
        self._semaphore = asyncio.Semaphore(self.concurrency)
        self.results = []
        self.success_count = 0
        self.failed_count = 0
        self.blocked_count = 0

        start = time.time()
        logger.info(f"[{self.competitor}] Starting scrape of {len(products)} products (concurrency={self.concurrency})")

        async with httpx.AsyncClient(http2=True) as client:
            tasks = [self._scrape_one(client, p) for p in products]
            self.results = await asyncio.gather(*tasks)

        elapsed = time.time() - start
        logger.info(
            f"[{self.competitor}] Done in {elapsed:.0f}s — "
            f"success={self.success_count}, failed={self.failed_count}, blocked={self.blocked_count}"
        )

        return self.results


def parse_json_ld(html: str) -> dict | None:
    """Try to extract JSON-LD Product data from HTML."""
    try:
        # Find all JSON-LD blocks
        import re

        blocks = re.findall(
            r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            html,
            re.DOTALL | re.IGNORECASE,
        )
        for block in blocks:
            try:
                data = json.loads(block.strip())
                # Handle @graph arrays
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get("@type") == "Product":
                            return item
                elif isinstance(data, dict):
                    if data.get("@type") == "Product":
                        return data
                    if "@graph" in data:
                        for item in data["@graph"]:
                            if isinstance(item, dict) and item.get("@type") == "Product":
                                return item
            except json.JSONDecodeError:
                continue
    except Exception:
        pass
    return None


def extract_price_from_json_ld(data: dict) -> tuple[float | None, float | None]:
    """Extract price and original price from JSON-LD Product data."""
    price = None
    original_price = None

    offers = data.get("offers", {})
    if isinstance(offers, list):
        offers = offers[0] if offers else {}

    price_str = offers.get("price") or offers.get("lowPrice")
    if price_str is not None:
        try:
            price = float(price_str)
        except (ValueError, TypeError):
            pass

    high_price = offers.get("highPrice")
    if high_price is not None:
        try:
            original_price = float(high_price)
        except (ValueError, TypeError):
            pass

    return price, original_price
