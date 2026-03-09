-- Noon Minutes Price Monitor — Views & Functions

-- View: Latest prices per product across all competitors + Noon
CREATE OR REPLACE VIEW pm_latest_prices AS
WITH latest_snapshots AS (
  SELECT DISTINCT ON (product_id, competitor)
    product_id,
    competitor,
    price,
    original_price,
    discount_pct,
    in_stock,
    delivery_text,
    promo_label,
    scrape_date,
    scrape_status
  FROM pm_price_snapshots
  WHERE scrape_status = 'success'
  ORDER BY product_id, competitor, scrape_date DESC
),
latest_noon AS (
  SELECT DISTINCT ON (product_id)
    product_id,
    price AS noon_price,
    original_price AS noon_original_price,
    in_stock AS noon_in_stock,
    promo_label AS noon_promo,
    price_date AS noon_date
  FROM pm_noon_prices
  ORDER BY product_id, price_date DESC
),
pivoted AS (
  SELECT
    p.id,
    p.sku,
    p.title,
    p.category,
    p.brand,
    p.is_top_2500,

    n.noon_price,
    n.noon_original_price,
    n.noon_in_stock,
    n.noon_promo,
    n.noon_date,

    MAX(CASE WHEN s.competitor = 'amazon' THEN s.price END) AS amazon_price,
    MAX(CASE WHEN s.competitor = 'amazon' THEN s.original_price END) AS amazon_original_price,
    MAX(CASE WHEN s.competitor = 'amazon' THEN s.in_stock END) AS amazon_in_stock,
    MAX(CASE WHEN s.competitor = 'amazon' THEN s.delivery_text END) AS amazon_delivery,
    MAX(CASE WHEN s.competitor = 'amazon' THEN s.promo_label END) AS amazon_promo,
    MAX(CASE WHEN s.competitor = 'amazon' THEN s.scrape_date END) AS amazon_date,

    MAX(CASE WHEN s.competitor = 'ninja' THEN s.price END) AS ninja_price,
    MAX(CASE WHEN s.competitor = 'ninja' THEN s.original_price END) AS ninja_original_price,
    MAX(CASE WHEN s.competitor = 'ninja' THEN s.in_stock END) AS ninja_in_stock,
    MAX(CASE WHEN s.competitor = 'ninja' THEN s.delivery_text END) AS ninja_delivery,
    MAX(CASE WHEN s.competitor = 'ninja' THEN s.promo_label END) AS ninja_promo,
    MAX(CASE WHEN s.competitor = 'ninja' THEN s.scrape_date END) AS ninja_date,

    MAX(CASE WHEN s.competitor = 'lulu' THEN s.price END) AS lulu_price,
    MAX(CASE WHEN s.competitor = 'lulu' THEN s.original_price END) AS lulu_original_price,
    MAX(CASE WHEN s.competitor = 'lulu' THEN s.in_stock END) AS lulu_in_stock,
    MAX(CASE WHEN s.competitor = 'lulu' THEN s.delivery_text END) AS lulu_delivery,
    MAX(CASE WHEN s.competitor = 'lulu' THEN s.promo_label END) AS lulu_promo,
    MAX(CASE WHEN s.competitor = 'lulu' THEN s.scrape_date END) AS lulu_date

  FROM pm_products p
  LEFT JOIN latest_snapshots s ON s.product_id = p.id
  LEFT JOIN latest_noon n ON n.product_id = p.id
  GROUP BY p.id, p.sku, p.title, p.category, p.brand, p.is_top_2500,
           n.noon_price, n.noon_original_price, n.noon_in_stock, n.noon_promo, n.noon_date
)
SELECT
  *,
  LEAST(
    NULLIF(amazon_price, NULL),
    NULLIF(ninja_price, NULL),
    NULLIF(lulu_price, NULL)
  ) AS cheapest_competitor_price,
  CASE
    WHEN noon_price IS NULL THEN 'no_noon_price'
    WHEN LEAST(amazon_price, ninja_price, lulu_price) IS NULL THEN 'no_competitor_price'
    WHEN noon_price <= LEAST(
      COALESCE(amazon_price, 999999),
      COALESCE(ninja_price, 999999),
      COALESCE(lulu_price, 999999)
    ) THEN 'cheapest'
    ELSE 'undercut'
  END AS price_position,
  CASE
    WHEN noon_price IS NOT NULL AND LEAST(
      COALESCE(amazon_price, 999999),
      COALESCE(ninja_price, 999999),
      COALESCE(lulu_price, 999999)
    ) < 999999 THEN
      ROUND(
        (noon_price - LEAST(
          COALESCE(amazon_price, 999999),
          COALESCE(ninja_price, 999999),
          COALESCE(lulu_price, 999999)
        )) / NULLIF(noon_price, 0) * 100,
        1
      )
    ELSE NULL
  END AS price_gap_pct
FROM pivoted;

-- Function: Summary stats for dashboard & email
CREATE OR REPLACE FUNCTION pm_get_price_position_summary()
RETURNS JSON
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'total_products', (SELECT COUNT(*) FROM pm_products),
    'with_noon_price', (SELECT COUNT(*) FROM pm_latest_prices WHERE noon_price IS NOT NULL),
    'with_competitor_price', (SELECT COUNT(*) FROM pm_latest_prices WHERE cheapest_competitor_price IS NOT NULL),
    'noon_cheapest_count', (SELECT COUNT(*) FROM pm_latest_prices WHERE price_position = 'cheapest'),
    'undercut_count', (SELECT COUNT(*) FROM pm_latest_prices WHERE price_position = 'undercut'),
    'noon_cheapest_pct', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE price_position = 'cheapest')::NUMERIC /
        NULLIF(COUNT(*) FILTER (WHERE price_position IN ('cheapest', 'undercut')), 0) * 100,
        1
      )
      FROM pm_latest_prices
    ),
    'avg_gap_pct', (
      SELECT ROUND(AVG(ABS(price_gap_pct)), 1)
      FROM pm_latest_prices
      WHERE price_position = 'undercut'
    ),
    'top_undercuts', (
      SELECT json_agg(t)
      FROM (
        SELECT id, sku, title, category, noon_price, cheapest_competitor_price, price_gap_pct
        FROM pm_latest_prices
        WHERE price_position = 'undercut'
        ORDER BY price_gap_pct DESC
        LIMIT 10
      ) t
    )
  );
$$;
