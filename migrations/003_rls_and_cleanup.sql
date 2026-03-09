-- Noon Minutes Price Monitor — RLS Policies & Cleanup Job

-- Enable Row Level Security on all tables
ALTER TABLE pm_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_noon_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_scrape_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_price_alerts ENABLE ROW LEVEL SECURITY;

-- Public read access (dashboard uses anon key)
CREATE POLICY "Public read pm_products" ON pm_products FOR SELECT USING (true);
CREATE POLICY "Public read pm_price_snapshots" ON pm_price_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read pm_noon_prices" ON pm_noon_prices FOR SELECT USING (true);
CREATE POLICY "Public read pm_scrape_runs" ON pm_scrape_runs FOR SELECT USING (true);
CREATE POLICY "Public read pm_price_alerts" ON pm_price_alerts FOR SELECT USING (true);

-- Service role write access (scraper & upload API use service key)
CREATE POLICY "Service write pm_products" ON pm_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write pm_price_snapshots" ON pm_price_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write pm_noon_prices" ON pm_noon_prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write pm_scrape_runs" ON pm_scrape_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write pm_price_alerts" ON pm_price_alerts FOR ALL USING (true) WITH CHECK (true);

-- Update trigger for pm_products.updated_at
CREATE OR REPLACE FUNCTION pm_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pm_products_updated
  BEFORE UPDATE ON pm_products
  FOR EACH ROW EXECUTE FUNCTION pm_update_timestamp();

-- Cleanup: delete snapshots older than 90 days
-- Enable pg_cron extension first (run once in Supabase dashboard → Extensions)
-- Then schedule:
--
-- SELECT cron.schedule(
--   'pm-cleanup-old-snapshots',
--   '0 4 * * *',  -- 4 AM UTC daily
--   $$DELETE FROM pm_price_snapshots WHERE scrape_date < CURRENT_DATE - INTERVAL '90 days'$$
-- );
--
-- SELECT cron.schedule(
--   'pm-cleanup-old-alerts',
--   '0 4 * * *',
--   $$DELETE FROM pm_price_alerts WHERE alert_date < CURRENT_DATE - INTERVAL '90 days'$$
-- );
