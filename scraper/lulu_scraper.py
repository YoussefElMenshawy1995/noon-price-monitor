"""
Lulu Hypermarket (gcc.luluhypermarket.com) scraper — JSON-LD preferred, CSS fallback.
"""

from __future__ import annotations

import logging
import re

from selectolax.parser import HTMLParser

from base_scraper import BaseScraper, ScrapeResult, parse_json_ld, extract_price_from_json_ld
from config import LULU_CONCURRENCY, LULU_DELAY_MIN, LULU_DELAY_MAX

logger = logging.getLogger(__name__)


class LuluScraper(BaseScraper):
    competitor = "lulu"
    concurrency = LULU_CONCURRENCY
    delay_min = LULU_DELAY_MIN
    delay_max = LULU_DELAY_MAX

    def is_blocked(self, html: str) -> bool:
        lower = html.lower()
        if "access denied" in lower and ("cloudflare" in lower or "incapsula" in lower):
            return True
        if "blocked" in lower and "security" in lower and len(html) < 5000:
            return True
        return False

    async def parse_product(self, html: str, url: str, product: dict) -> ScrapeResult:
        result = ScrapeResult(
            product_id=product["id"],
            competitor="lulu",
        )

        # Try JSON-LD first
        json_ld = parse_json_ld(html)
        if json_ld:
            price, original_price = extract_price_from_json_ld(json_ld)
            result.price = price
            result.original_price = original_price

            offers = json_ld.get("offers", {})
            if isinstance(offers, list):
                offers = offers[0] if offers else {}
            availability = offers.get("availability", "")
            if "OutOfStock" in availability:
                result.in_stock = False

        # CSS fallback
        tree = HTMLParser(html)

        if result.price is None:
            for selector in [
                ".product-price .item-price",
                ".product-price .price",
                "span[data-price-type='finalPrice'] .price",
                ".price-box .price",
                ".special-price .price",
                ".product-info-price .price",
            ]:
                node = tree.css_first(selector)
                if node:
                    result.price = self._parse_price(node.text())
                    if result.price:
                        break

        # Original price
        if result.original_price is None:
            for selector in [
                ".product-price .old-price",
                ".old-price .price",
                "span[data-price-type='oldPrice'] .price",
                ".price-box .old-price .price",
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

        # Availability
        for selector in [
            ".out-of-stock",
            ".product-out-of-stock",
            "[data-testid='out-of-stock']",
        ]:
            node = tree.css_first(selector)
            if node:
                result.in_stock = False
                result.availability_text = node.text(strip=True)[:200]
                break

        # Check "Add to Cart" button existence as stock signal
        add_btn = tree.css_first("button.tocart, button.add-to-cart, #product-addtocart-button")
        if add_btn is None and result.in_stock:
            # No add-to-cart button might mean out of stock — but don't override explicit OOS
            pass

        # Delivery
        for selector in [
            ".delivery-info",
            ".delivery-block",
            ".shipping-info",
            "[data-testid='delivery']",
        ]:
            node = tree.css_first(selector)
            if node:
                result.delivery_text = node.text(strip=True)[:200]
                break

        # Promo
        for selector in [
            ".promo-label",
            ".offer-badge",
            ".product-label",
            ".discount-label",
            ".promotion-tag",
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
