"""Supabase database helper using REST API (no supabase-py dependency)."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

import httpx

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, DB_BATCH_SIZE

logger = logging.getLogger(__name__)


def _headers(prefer: str = "") -> dict[str, str]:
    """Build standard headers for Supabase REST API."""
    h = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _rest_url(table: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{table}"


# Use a module-level client for connection pooling
_client = httpx.Client(timeout=60)


def get_client():
    """Return the shared httpx client (API-compatible shim)."""
    return _client


def get_products_for_competitor(client: Any, competitor: str) -> list[dict]:
    """Fetch all products that have a URL for the given competitor."""
    url_col = f"{competitor}_url"
    # Amazon uses 'amazon_asin' instead of 'amazon_product_id'
    id_col = "amazon_asin" if competitor == "amazon" else f"{competitor}_product_id"
    rows = []
    page_size = 1000
    start = 0

    while True:
        resp = client.get(
            _rest_url("pm_products"),
            params={
                "select": f"id,sku,title,{url_col},{id_col}",
                f"{url_col}": "not.is.null",
                "order": "id",
                "offset": str(start),
                "limit": str(page_size),
            },
            headers=_headers(),
        )
        batch = resp.json() if resp.status_code == 200 else []
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size

    logger.info(f"Loaded {len(rows)} products with {competitor} URLs")
    return rows


def upsert_snapshots(client: Any, snapshots: list[dict]) -> int:
    """Batch upsert price snapshots. Returns number of rows upserted."""
    if not snapshots:
        return 0

    total = 0
    for i in range(0, len(snapshots), DB_BATCH_SIZE):
        batch = snapshots[i : i + DB_BATCH_SIZE]
        resp = client.post(
            _rest_url("pm_price_snapshots"),
            json=batch,
            headers=_headers("resolution=merge-duplicates"),
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Upsert snapshots failed: {resp.status_code} {resp.text[:200]}")
        total += len(batch)
        logger.info(f"Upserted {total}/{len(snapshots)} snapshots")

    return total


def upsert_noon_prices(client: Any, prices: list[dict]) -> int:
    """Batch upsert Noon prices from CSV upload."""
    if not prices:
        return 0

    total = 0
    for i in range(0, len(prices), DB_BATCH_SIZE):
        batch = prices[i : i + DB_BATCH_SIZE]
        resp = client.post(
            _rest_url("pm_noon_prices"),
            json=batch,
            headers=_headers("resolution=merge-duplicates"),
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Upsert noon prices failed: {resp.status_code} {resp.text[:200]}")
        total += len(batch)

    return total


def create_scrape_run(client: Any, competitor: str, total_urls: int) -> int:
    """Create a new scrape run entry. Returns the run ID."""
    resp = client.post(
        _rest_url("pm_scrape_runs"),
        json={
            "competitor": competitor,
            "total_urls": total_urls,
            "status": "running",
            "started_at": datetime.utcnow().isoformat(),
        },
        headers=_headers("return=representation"),
    )
    data = resp.json()
    run_id = data[0]["id"] if isinstance(data, list) else data["id"]
    logger.info(f"Created scrape run {run_id} for {competitor} ({total_urls} URLs)")
    return run_id


def finish_scrape_run(
    client: Any,
    run_id: int,
    status: str,
    success: int,
    failed: int,
    blocked: int,
    duration_seconds: int,
    error_message: str | None = None,
) -> None:
    """Update a scrape run with final results."""
    resp = client.patch(
        _rest_url("pm_scrape_runs") + f"?id=eq.{run_id}",
        json={
            "status": status,
            "success_count": success,
            "failed_count": failed,
            "blocked_count": blocked,
            "duration_seconds": duration_seconds,
            "finished_at": datetime.utcnow().isoformat(),
            "error_message": error_message,
        },
        headers=_headers(),
    )
    if resp.status_code not in (200, 204):
        logger.error(f"Finish scrape run failed: {resp.status_code} {resp.text[:200]}")


def insert_alerts(client: Any, alerts: list[dict]) -> int:
    """Batch insert price alerts."""
    if not alerts:
        return 0

    total = 0
    for i in range(0, len(alerts), DB_BATCH_SIZE):
        batch = alerts[i : i + DB_BATCH_SIZE]
        resp = client.post(
            _rest_url("pm_price_alerts"),
            json=batch,
            headers=_headers(),
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Insert alerts failed: {resp.status_code} {resp.text[:200]}")
        total += len(batch)

    logger.info(f"Inserted {total} alerts")
    return total


def get_sku_to_product_id(client: Any) -> dict[str, int]:
    """Build a SKU -> product ID mapping for CSV upload."""
    mapping = {}
    page_size = 1000
    start = 0

    while True:
        resp = client.get(
            _rest_url("pm_products"),
            params={
                "select": "id,sku",
                "order": "id",
                "offset": str(start),
                "limit": str(page_size),
            },
            headers=_headers(),
        )
        batch = resp.json() if resp.status_code == 200 else []
        if not batch:
            break
        for row in batch:
            mapping[row["sku"]] = row["id"]
        if len(batch) < page_size:
            break
        start += page_size

    return mapping
