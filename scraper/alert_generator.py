"""
Alert generator — compares today's prices vs yesterday's and generates alerts.
Runs after all scrapers finish.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

from supabase import Client

from config import PRICE_CHANGE_THRESHOLD_PCT
from db import insert_alerts

logger = logging.getLogger(__name__)


def generate_alerts(client: Client) -> int:
    """
    Compare today's snapshots vs yesterday's for each product/competitor.
    Generate alerts for significant changes.
    Returns number of alerts created.
    """
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    # Get today's successful snapshots
    today_resp = (
        client.table("pm_price_snapshots")
        .select("product_id, competitor, price, in_stock, promo_label")
        .eq("scrape_date", today)
        .eq("scrape_status", "success")
        .execute()
    )
    today_data = {(r["product_id"], r["competitor"]): r for r in today_resp.data}

    # Get yesterday's successful snapshots
    yesterday_resp = (
        client.table("pm_price_snapshots")
        .select("product_id, competitor, price, in_stock, promo_label")
        .eq("scrape_date", yesterday)
        .eq("scrape_status", "success")
        .execute()
    )
    yesterday_data = {(r["product_id"], r["competitor"]): r for r in yesterday_resp.data}

    # Get latest Noon prices for undercut detection
    noon_resp = (
        client.rpc("pm_get_price_position_summary")
        .execute()
    )

    # Build a quick product_id -> noon_price map from pm_noon_prices
    noon_prices_resp = (
        client.table("pm_noon_prices")
        .select("product_id, price")
        .eq("price_date", today)
        .execute()
    )
    # Fallback to yesterday if no today prices
    if not noon_prices_resp.data:
        noon_prices_resp = (
            client.table("pm_noon_prices")
            .select("product_id, price")
            .eq("price_date", yesterday)
            .execute()
        )
    noon_price_map = {r["product_id"]: r["price"] for r in noon_prices_resp.data}

    alerts = []

    for key, today_row in today_data.items():
        product_id, competitor = key
        yesterday_row = yesterday_data.get(key)
        noon_price = noon_price_map.get(product_id)

        today_price = today_row["price"]
        today_in_stock = today_row["in_stock"]
        today_promo = today_row["promo_label"]

        if yesterday_row:
            yest_price = yesterday_row["price"]
            yest_in_stock = yesterday_row["in_stock"]
            yest_promo = yesterday_row["promo_label"]

            # Price drop
            if today_price and yest_price and today_price < yest_price:
                pct = round((yest_price - today_price) / yest_price * 100, 1)
                if pct >= PRICE_CHANGE_THRESHOLD_PCT:
                    alerts.append({
                        "product_id": product_id,
                        "competitor": competitor,
                        "alert_type": "price_drop",
                        "alert_date": today,
                        "message": f"{competitor} dropped price by {pct}%",
                        "old_price": yest_price,
                        "new_price": today_price,
                        "noon_price": noon_price,
                        "pct_change": -pct,
                    })

            # Price increase
            if today_price and yest_price and today_price > yest_price:
                pct = round((today_price - yest_price) / yest_price * 100, 1)
                if pct >= PRICE_CHANGE_THRESHOLD_PCT:
                    alerts.append({
                        "product_id": product_id,
                        "competitor": competitor,
                        "alert_type": "price_increase",
                        "alert_date": today,
                        "message": f"{competitor} increased price by {pct}%",
                        "old_price": yest_price,
                        "new_price": today_price,
                        "noon_price": noon_price,
                        "pct_change": pct,
                    })

            # Out of stock
            if yest_in_stock and not today_in_stock:
                alerts.append({
                    "product_id": product_id,
                    "competitor": competitor,
                    "alert_type": "out_of_stock",
                    "alert_date": today,
                    "message": f"{competitor} went out of stock",
                    "old_price": yest_price,
                    "new_price": today_price,
                    "noon_price": noon_price,
                })

            # Back in stock
            if not yest_in_stock and today_in_stock:
                alerts.append({
                    "product_id": product_id,
                    "competitor": competitor,
                    "alert_type": "back_in_stock",
                    "alert_date": today,
                    "message": f"{competitor} is back in stock",
                    "old_price": yest_price,
                    "new_price": today_price,
                    "noon_price": noon_price,
                })

            # New promo
            if today_promo and today_promo != yest_promo:
                alerts.append({
                    "product_id": product_id,
                    "competitor": competitor,
                    "alert_type": "new_promo",
                    "alert_date": today,
                    "message": f"{competitor} new promo: {today_promo[:100]}",
                    "new_price": today_price,
                    "noon_price": noon_price,
                })

        # Undercut detection (regardless of yesterday data)
        if today_price and noon_price and today_price < noon_price:
            pct = round((noon_price - today_price) / noon_price * 100, 1)
            if pct >= PRICE_CHANGE_THRESHOLD_PCT:
                # Only alert if this is new (wasn't undercutting yesterday)
                if yesterday_row:
                    yest_price = yesterday_row["price"]
                    if yest_price and yest_price < noon_price:
                        continue  # Was already undercutting, skip
                alerts.append({
                    "product_id": product_id,
                    "competitor": competitor,
                    "alert_type": "undercut",
                    "alert_date": today,
                    "message": f"{competitor} is {pct}% cheaper than Noon",
                    "new_price": today_price,
                    "noon_price": noon_price,
                    "pct_change": -pct,
                })

    count = insert_alerts(client, alerts)
    logger.info(f"Generated {count} alerts for {today}")
    return count
