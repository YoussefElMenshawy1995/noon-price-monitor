-- Noon Minutes Price Monitor — Core Tables
-- Run this on your Supabase SQL Editor (or via supabase db push)

-- 1. Master product catalog
CREATE TABLE pm_products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  is_top_2500 BOOLEAN DEFAULT FALSE,

  -- Noon
  noon_debugger_url TEXT,

  -- Amazon
  amazon_sku TEXT,
  amazon_url TEXT,
  amazon_asin TEXT,

  -- Ninja
  ninja_sku TEXT,
  ninja_url TEXT,
  ninja_product_id TEXT,

  -- Lulu
  lulu_sku TEXT,
  lulu_url TEXT,
  lulu_product_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pm_products_sku ON pm_products(sku);
CREATE INDEX idx_pm_products_category ON pm_products(category);
CREATE INDEX idx_pm_products_is_top_2500 ON pm_products(is_top_2500);

-- 2. Daily competitor price snapshots
CREATE TABLE pm_price_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES pm_products(id) ON DELETE CASCADE,
  competitor TEXT NOT NULL CHECK (competitor IN ('amazon', 'ninja', 'lulu')),
  scrape_date DATE NOT NULL DEFAULT CURRENT_DATE,

  price NUMERIC(10, 2),
  original_price NUMERIC(10, 2),
  discount_pct NUMERIC(5, 2),
  in_stock BOOLEAN DEFAULT TRUE,
  availability_text TEXT,
  delivery_text TEXT,
  promo_label TEXT,
  scrape_status TEXT DEFAULT 'success' CHECK (scrape_status IN ('success', 'failed', 'blocked', 'not_found')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (product_id, competitor, scrape_date)
);

CREATE INDEX idx_pm_snapshots_date ON pm_price_snapshots(scrape_date);
CREATE INDEX idx_pm_snapshots_competitor ON pm_price_snapshots(competitor);
CREATE INDEX idx_pm_snapshots_product_date ON pm_price_snapshots(product_id, scrape_date);

-- 3. Noon prices (manually uploaded by Youssef)
CREATE TABLE pm_noon_prices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES pm_products(id) ON DELETE CASCADE,
  price_date DATE NOT NULL DEFAULT CURRENT_DATE,

  price NUMERIC(10, 2),
  original_price NUMERIC(10, 2),
  in_stock BOOLEAN DEFAULT TRUE,
  promo_label TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (product_id, price_date)
);

CREATE INDEX idx_pm_noon_prices_date ON pm_noon_prices(price_date);

-- 4. Scrape run logs
CREATE TABLE pm_scrape_runs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  competitor TEXT NOT NULL CHECK (competitor IN ('amazon', 'ninja', 'lulu')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),

  total_urls INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  blocked_count INT DEFAULT 0,
  duration_seconds INT,

  error_message TEXT
);

CREATE INDEX idx_pm_scrape_runs_started ON pm_scrape_runs(started_at);

-- 5. Auto-generated price alerts
CREATE TABLE pm_price_alerts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES pm_products(id) ON DELETE CASCADE,
  competitor TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'price_drop', 'price_increase', 'out_of_stock', 'back_in_stock', 'undercut', 'new_promo'
  )),
  alert_date DATE NOT NULL DEFAULT CURRENT_DATE,

  message TEXT,
  old_price NUMERIC(10, 2),
  new_price NUMERIC(10, 2),
  noon_price NUMERIC(10, 2),
  pct_change NUMERIC(5, 2),
  is_read BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pm_alerts_date ON pm_price_alerts(alert_date);
CREATE INDEX idx_pm_alerts_type ON pm_price_alerts(alert_type);
CREATE INDEX idx_pm_alerts_unread ON pm_price_alerts(is_read) WHERE NOT is_read;
