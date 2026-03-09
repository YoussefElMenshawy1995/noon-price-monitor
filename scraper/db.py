"""Supabase database helper for batch operations."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

from supabase import create_client, Client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, DB_BATCH_SIZE

logger = logging.getLogger(__name__)


def get_client() -> Client:
    """Create a Supabase client using the service role key."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_products_for_competitor(client: Client, competitor: str) -> list[dict]:
    """Fetch all products that have a URL for the given competitor."""
    url_col = f"{competitor}_url"
    rows = []
    page_size = 1000
    start = 0

    while True:
        resp = (
            client.table("pm_products")
            .select(f"id, sku, title, {url_col}, {competitor}_product_id")
            .not_.is_(url_col, "null")
            .neq(url_col, "")
            .range(start, start + page_size - 1)
            .execute()
        )
        batch = resp.data
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size

    logger.info(f"Loaded {len(rows)} products with {competitor} URLs")
    return rows


def upsert_snapshots(client: Client, snapshots: list[dict]) -> int:
    """Batch upsert price snapshots. Returns number of rows upserted."""
    if not snapshots:
        return 0

    total = 0
    for i in range(0, len(snapshots), DB_BATCH_SIZE):
        batch = snapshots[i : i + DB_BATCH_SIZE]
        client.table("pm_price_snapshots").upsert(
            batch, on_conflict="product_id,competitor,scrape_date"
        ).execute()
        total += len(batch)
        logger.info(f"Upserted {total}/{len(snapshots)} snapshots")

    return total


def upsert_noon_prices(client: Client, prices: list[dict]) -> int:
    """Batch upsert Noon prices from CSV upload."""
    if not prices:
        return 0

    total = 0
    for i in range(0, len(prices), DB_BATCH_SIZE):
        batch = prices[i : i + DB_BATCH_SIZE]
        client.table("pm_noon_prices").upsert(
            batch, on_conflict="product_id,price_date"
        ).execute()
        total += len(batch)

    return total


def create_scrape_run(client: Client, competitor: str, total_urls: int) -> int:
    """Create a new scrape run entry. Returns the run ID."""
    resp = (
        client.table("pm_scrape_runs")
        .insert(
            {
                "competitor": competitor,
                "total_urls": total_urls,
                "status": "running",
                "started_at": datetime.utcnow().isoformat(),
            }
        )
        .execute()
    )
    run_id = resp.data[0]["id"]
    logger.info(f"Created scrape run {run_id} for {competitor} ({total_urls} URLs)")
    return run_id


def finish_scrape_run(
    client: Client,
    run_id: int,
    status: str,
    success: int,
    failed: int,
    blocked: int,
    duration_seconds: int,
    error_message: str | None = None,
) -> None:
    """Update a scrape run with final results."""
    client.table("pm_scrape_runs").update(
        {
            "status": status,
            "success_count": success,
            "failed_count": failed,
            "blocked_count": blocked,
            "duration_seconds": duration_seconds,
            "finished_at": datetime.utcnow().isoformat(),
            "error_message": error_message,
        }
    ).eq("id", run_id).execute()


def insert_alerts(client: Client, alerts: list[dict]) -> int:
    """Batch insert price alerts."""
    if not alerts:
        return 0

    total = 0
    for i in range(0, len(alerts), DB_BATCH_SIZE):
        batch = alerts[i : i + DB_BATCH_SIZE]
        client.table("pm_price_alerts").insert(batch).execute()
        total += len(batch)

    logger.info(f"Inserted {total} alerts")
    return total


def get_sku_to_product_id(client: Client) -> dict[str, int]:
    """Build a SKU -> product ID mapping for CSV upload."""
    mapping = {}
    page_size = 1000
    start = 0

    while True:
        resp = (
            client.table("pm_products")
            .select("id, sku")
            .range(start, start + page_size - 1)
            .execute()
        )
        batch = resp.data
        if not batch:
            break
        for row in batch:
            mapping[row["sku"]] = row["id"]
        if len(batch) < page_size:
            break
        start += page_size

    return mapping
