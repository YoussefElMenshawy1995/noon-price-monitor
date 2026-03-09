"""
Ninja (ananinja.com) scraper — JSON-LD preferred, CSS fallback.
"""

from __future__ import annotations

import logging
import re

from selectolax.parser import HTMLParser

from base_scraper import BaseScraper, ScrapeResult, parse_json_ld, extract_price_from_json_ld
from config import NINJA_CONCURRENCY, NINJA_DELAY_MIN, NINJA_DELAY_MAX

logger = logging.getLogger(__name__)


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

        # Try JSON-LD first (most reliable)
        json_ld = parse_json_ld(html)
        if json_ld:
            price, original_price = extract_price_from_json_ld(json_ld)
            result.price = price
            result.original_price = original_price

            # Check availability from JSON-LD
            offers = json_ld.get("offers", {})
            if isinstance(offers, list):
                offers = offers[0] if offers else {}
            availability = offers.get("availability", "")
            if "OutOfStock" in availability:
                result.in_stock = False

        # CSS fallback if JSON-LD didn't give us a price
        tree = HTMLParser(html)

        if result.price is None:
            # Try common Ninja price selectors
            for selector in [
                "[data-testid='product-price']",
                ".product-price",
                ".price-current",
                ".pdp-price",
                "span.price",
            ]:
                node = tree.css_first(selector)
                if node:
                    result.price = self._parse_price(node.text())
                    if result.price:
                        break

        # Original price (strikethrough)
        if result.original_price is None:
            for selector in [
                "[data-testid='product-original-price']",
                ".price-old",
                ".price-was",
                "del .price",
                "s .price",
            ]:
                node = tree.css_first(selector)
                if node:
                    op = self._parse_price(node.text())
                    if op and op != result.price:
                        result.original_price = op
                        break

        # Discount
        if result.price and result.original_price and result.original_price > result.price:
            result.discount_pct = round(
                (result.original_price - result.price) / result.original_price * 100, 1
            )

        # Availability (CSS fallback)
        for selector in [
            "[data-testid='out-of-stock']",
            ".out-of-stock",
            ".sold-out",
        ]:
            node = tree.css_first(selector)
            if node:
                result.in_stock = False
                result.availability_text = node.text(strip=True)[:200]
                break

        # Delivery text
        for selector in [
            "[data-testid='delivery-info']",
            ".delivery-info",
            ".delivery-estimate",
        ]:
            node = tree.css_first(selector)
            if node:
                result.delivery_text = node.text(strip=True)[:200]
                break

        # Promo label
        for selector in [
            "[data-testid='promo-badge']",
            ".promo-badge",
            ".offer-tag",
            ".discount-badge",
        ]:
            node = tree.css_first(selector)
            if node:
                result.promo_label = node.text(strip=True)[:200]
                break

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
