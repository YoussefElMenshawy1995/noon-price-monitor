"""
Ninja (ananinja.com) scraper.

The site is a Next.js RSC app. JSON-LD is embedded inside
self.__next_f.push() calls, NOT in standard <script type="application/ld+json">
tags.  We extract prices using three strategies:

1. RSC-embedded JSON-LD  ("price": XX.XX inside __next_f.push chunks)
2. Embedded product data  ("priceCents": XXXX)
3. Visible HTML price tags (CSS selectors)
"""

from __future__ import annotations

import json
import logging
import re

from selectolax.parser import HTMLParser

from base_scraper import BaseScraper, ScrapeResult
from config import NINJA_CONCURRENCY, NINJA_DELAY_MIN, NINJA_DELAY_MAX

logger = logging.getLogger(__name__)

# ── regex patterns compiled once ─────────────────────────────
_RE_RSC_PRICE = re.compile(
    r'"@type"\s*:\s*"Offer".*?"price"\s*:\s*(\d+(?:\.\d+)?)', re.DOTALL
)
_RE_RSC_AVAIL = re.compile(r'"availability"\s*:\s*"([^"]+)"')
_RE_PRICE_CENTS = re.compile(r'"priceCents"\s*:\s*(\d+)')
_RE_ORIG_PRICE_CENTS = re.compile(r'"originalPriceCents"\s*:\s*(\d+)')
_RE_DISC_PRICE_CENTS = re.compile(r'"discountedPriceCents"\s*:\s*(\d+)')


class NinjaScraper(BaseScraper):
    competitor = "ninja"
    concurrency = NINJA_CONCURRENCY
    delay_min = NINJA_DELAY_MIN
    delay_max = NINJA_DELAY_MAX

    def is_blocked(self, html: str) -> bool:
        lower = html.lower()
        if "access denied" in lower and "cloudflare" in lower:
            return True
        if "ray id" in lower and "cloudflare" in lower:
            return True
        return False

    async def parse_product(self, html: str, url: str, product: dict) -> ScrapeResult:
        result = ScrapeResult(
            product_id=product["id"],
            competitor="ninja",
        )

        # ── Strategy 1: RSC-embedded JSON-LD ─────────────────
        # Ninja uses Next.js RSC; JSON-LD lives inside self.__next_f.push() chunks
        m = _RE_RSC_PRICE.search(html)
        if m:
            result.price = float(m.group(1))

        avail = _RE_RSC_AVAIL.search(html)
        if avail and "OutOfStock" in avail.group(1):
            result.in_stock = False

        # ── Strategy 2: priceCents from embedded product JSON ─
        if result.price is None:
            mc = _RE_PRICE_CENTS.search(html)
            if mc:
                cents = int(mc.group(1))
                if cents > 0:
                    result.price = cents / 100.0

        # originalPriceCents for original price
        if result.original_price is None:
            mo = _RE_ORIG_PRICE_CENTS.search(html)
            if mo:
                orig_cents = int(mo.group(1))
                if orig_cents > 0:
                    result.original_price = orig_cents / 100.0

        # discountedPriceCents — if non-zero, this is the sale price
        md = _RE_DISC_PRICE_CENTS.search(html)
        if md:
            disc_cents = int(md.group(1))
            if disc_cents > 0:
                # discountedPriceCents is the sale price; priceCents is original
                result.original_price = result.price
                result.price = disc_cents / 100.0

        # ── Strategy 3: CSS fallback on visible HTML ──────────
        if result.price is None:
            tree = HTMLParser(html)
            for selector in [
                "p.text-lg.text-gray-500",
                "p.text-lg.leading-4",
                "h2.text-lg span p",
                "[data-testid='product-price']",
                ".product-price",
                "span.price",
            ]:
                node = tree.css_first(selector)
                if node:
                    result.price = self._parse_price(node.text())
                    if result.price:
                        break

        # ── Discount calculation ──────────────────────────────
        if result.price and result.original_price and result.original_price > result.price:
            result.discount_pct = round(
                (result.original_price - result.price) / result.original_price * 100, 1
            )

        # ── Status ────────────────────────────────────────────
        if result.price is None:
            result.scrape_status = "failed"

        return result

    @staticmethod
    def _parse_price(text: str) -> float | None:
        if not text:
            return None
        cleaned = re.sub(r"[^\d.,]", "", text.replace(",", ""))
        try:
            return float(cleaned)
        except ValueError:
            return None
