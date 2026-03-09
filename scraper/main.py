"""
Main orchestrator — runs all scrapers sequentially, uploads results, generates alerts.

Usage:
  export SUPABASE_URL=https://xxx.supabase.co
  export SUPABASE_SERVICE_KEY=eyJ...
  python main.py [--competitor amazon|ninja|lulu]
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import time

from db import (
    get_client,
    get_products_for_competitor,
    upsert_snapshots,
    create_scrape_run,
    finish_scrape_run,
)
from amazon_scraper import AmazonScraper
from ninja_scraper import NinjaScraper
from lulu_scraper import LuluScraper
from alert_generator import generate_alerts

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

SCRAPERS = {
    "amazon": AmazonScraper,
    "ninja": NinjaScraper,
    "lulu": LuluScraper,
}

# Run order: Ninja & Lulu first (fast), Amazon last (slow)
DEFAULT_ORDER = ["ninja", "lulu", "amazon"]


async def run_scraper(competitor: str, limit: int = 0, offset: int = 0) -> dict:
    """Run a single competitor scraper end-to-end."""
    client = get_client()
    scraper_cls = SCRAPERS[competitor]
    scraper = scraper_cls()

    # Fetch products with URLs for this competitor
    products = get_products_for_competitor(client, competitor)
    if not products:
        logger.warning(f"No products found for {competitor}, skipping")
        return {"competitor": competitor, "skipped": True}

    # Apply offset and limit for batched runs
    if offset > 0:
        products = products[offset:]
    if limit > 0:
        products = products[:limit]

    if not products:
        logger.warning(f"No products in range (offset={offset}, limit={limit}), skipping")
        return {"competitor": competitor, "skipped": True}

    logger.info(f"[{competitor}] Scraping {len(products)} products (offset={offset}, limit={limit or 'all'})")

    # Create scrape run record
    run_id = create_scrape_run(client, competitor, len(products))

    start = time.time()
    try:
        # Run the scraper
        results = await scraper.scrape_all(products)

        # Upload results to Supabase
        snapshots = [r.to_dict() for r in results]
        upsert_snapshots(client, snapshots)

        duration = int(time.time() - start)
        finish_scrape_run(
            client,
            run_id,
            status="completed",
            success=scraper.success_count,
            failed=scraper.failed_count,
            blocked=scraper.blocked_count,
            duration_seconds=duration,
        )

        logger.info(
            f"[{competitor}] Complete — "
            f"{scraper.success_count} success, "
            f"{scraper.failed_count} failed, "
            f"{scraper.blocked_count} blocked, "
            f"{duration}s"
        )

        return {
            "competitor": competitor,
            "success": scraper.success_count,
            "failed": scraper.failed_count,
            "blocked": scraper.blocked_count,
            "duration": duration,
        }

    except Exception as e:
        duration = int(time.time() - start)
        logger.error(f"[{competitor}] Fatal error: {e}")
        finish_scrape_run(
            client,
            run_id,
            status="failed",
            success=scraper.success_count,
            failed=scraper.failed_count,
            blocked=scraper.blocked_count,
            duration_seconds=duration,
            error_message=str(e)[:500],
        )
        return {"competitor": competitor, "error": str(e)}


async def main():
    parser = argparse.ArgumentParser(description="Noon Minutes Price Scraper")
    parser.add_argument(
        "--competitor",
        choices=["amazon", "ninja", "lulu"],
        help="Run a single competitor only",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Limit number of products to scrape (0 = all)",
    )
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Skip first N products (for batched runs)",
    )
    args = parser.parse_args()

    competitors = [args.competitor] if args.competitor else DEFAULT_ORDER

    logger.info(f"Starting scrape for: {', '.join(competitors)}")
    total_start = time.time()

    results = []
    for competitor in competitors:
        result = await run_scraper(competitor, limit=args.limit, offset=args.offset)
        results.append(result)

    # Generate alerts after all scrapers finish
    logger.info("Generating alerts...")
    client = get_client()
    try:
        alert_count = generate_alerts(client)
        logger.info(f"Generated {alert_count} alerts")
    except Exception as e:
        logger.error(f"Alert generation failed: {e}")

    total_duration = int(time.time() - total_start)
    logger.info(f"All scrapers done in {total_duration}s")

    # Print summary
    print("\n=== SCRAPE SUMMARY ===")
    for r in results:
        if r.get("skipped"):
            print(f"  {r['competitor']}: SKIPPED (no URLs)")
        elif r.get("error"):
            print(f"  {r['competitor']}: ERROR — {r['error']}")
        else:
            rate = (
                round(r["success"] / (r["success"] + r["failed"] + r["blocked"]) * 100, 1)
                if (r["success"] + r["failed"] + r["blocked"]) > 0
                else 0
            )
            print(
                f"  {r['competitor']}: {r['success']} ok, "
                f"{r['failed']} fail, {r['blocked']} blocked "
                f"({rate}% success) in {r['duration']}s"
            )
    print(f"  Total: {total_duration}s")


if __name__ == "__main__":
    asyncio.run(main())
