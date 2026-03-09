"""
Amazon.sa scraper — low concurrency, CAPTCHA detection, full browser-like headers.
"""

from __future__ import annotations

import logging
import re

from selectolax.parser import HTMLParser

from base_scraper import BaseScraper, ScrapeResult
from config import AMAZON_CONCURRENCY, AMAZON_DELAY_MIN, AMAZON_DELAY_MAX

logger = logging.getLogger(__name__)


class AmazonScraper(BaseScraper):
    competitor = "amazon"
    concurrency = AMAZON_CONCURRENCY
    delay_min = AMAZON_DELAY_MIN
    delay_max = AMAZON_DELAY_MAX
    max_retries = 3  # Extra retry for Amazon

    def _get_headers(self) -> dict[str, str]:
        headers = super()._get_headers()
        # Amazon-specific headers
        headers.update(
            {
                "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
            }
        )
        return headers

    def is_blocked(self, html: str) -> bool:
        """Detect Amazon CAPTCHA or bot detection pages."""
        lower = html.lower()
        if "captcha" in lower and "robot" in lower:
            return True
        if "to discuss automated access" in lower:
            return True
        if "sorry, we just need to make sure" in lower:
            return True
        if "api-services-support@amazon" in lower:
            return True
        return False

    async def parse_product(self, html: str, url: str, product: dict) -> ScrapeResult:
        result = ScrapeResult(
            product_id=product["id"],
            competitor="amazon",
        )

        tree = HTMLParser(html)

        # --- Price ---
        price = None

        # Method 1: Whole price span
        for selector in [
            "span.a-price span.a-offscreen",
            "#priceblock_ourprice",
            "#priceblock_dealprice",
            "span.priceToPay span.a-offscreen",
            "#corePrice_feature_div span.a-offscreen",
            "#corePriceDisplay_desktop_feature_div span.a-offscreen",
        ]:
            node = tree.css_first(selector)
            if node:
                price = self._parse_price(node.text())
                if price:
                    break

        # Method 2: Whole + fraction parts
        if price is None:
            whole = tree.css_first("span.a-price-whole")
            fraction = tree.css_first("span.a-price-fraction")
            if whole:
                w = re.sub(r"[^\d]", "", whole.text())
                f = re.sub(r"[^\d]", "", fraction.text()) if fraction else "00"
                try:
                    price = float(f"{w}.{f}")
                except ValueError:
                    pass

        result.price = price

        # --- Original price (strikethrough) ---
        for selector in [
            "span.a-price[data-a-strike=true] span.a-offscreen",
            "#listPrice",
            "span.priceBlockStrikePriceString",
            ".basisPrice span.a-offscreen",
        ]:
            node = tree.css_first(selector)
            if node:
                op = self._parse_price(node.text())
                if op and op != price:
                    result.original_price = op
                    break

        # --- Discount ---
        if result.price and result.original_price and result.original_price > result.price:
            result.discount_pct = round(
                (result.original_price - result.price) / result.original_price * 100, 1
            )

        # --- Availability ---
        avail_node = tree.css_first("#availability")
        if avail_node:
            text = avail_node.text(strip=True).lower()
            result.availability_text = avail_node.text(strip=True)[:200]
            if "currently unavailable" in text or "out of stock" in text:
                result.in_stock = False
            elif "in stock" in text or "left in stock" in text:
                result.in_stock = True

        # --- Delivery ---
        delivery_node = tree.css_first("#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE")
        if not delivery_node:
            delivery_node = tree.css_first("#deliveryBlockMessage")
        if not delivery_node:
            delivery_node = tree.css_first("[data-csa-c-type='element'][data-csa-c-content-id='DEXUnifiedCXPDM']")
        if delivery_node:
            result.delivery_text = delivery_node.text(strip=True)[:200]

        # --- Promo / Coupon ---
        coupon_node = tree.css_first("#promoPriceBlockMessage_feature_div")
        if not coupon_node:
            coupon_node = tree.css_first(".couponBadge")
        if coupon_node:
            result.promo_label = coupon_node.text(strip=True)[:200]

        # If no price found, mark as failed
        if result.price is None:
            result.scrape_status = "failed"

        return result

    @staticmethod
    def _parse_price(text: str) -> float | None:
        """Parse price from text like 'SAR 49.95' or '49.95 ر.س'"""
        if not text:
            return None
        cleaned = re.sub(r"[^\d.,]", "", text.replace(",", ""))
        try:
            return float(cleaned)
        except ValueError:
            return None
