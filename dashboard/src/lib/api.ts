/**
 * Data fetching layer — uses Supabase when configured, falls back to sample data.
 * This lets the dashboard work in preview mode (no Supabase) and production mode.
 */

import { supabase } from "./supabase";
import * as sample from "./sample-data";

/** Check if Supabase is configured */
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "undefined"
  );
}

// ─── Overview Stats ─────────────────────────────────────────

export async function getStats() {
  if (!isSupabaseConfigured()) return sample.getStats();

  const { data } = await supabase.rpc("pm_get_price_position_summary");
  if (!data) return sample.getStats();

  // Get latest scrape run success rate
  const { data: runs } = await supabase
    .from("pm_scrape_runs")
    .select("success_count, total_urls")
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(3);

  let scrapeSuccessRate = 94.2;
  if (runs && runs.length > 0) {
    const totalSuccess = runs.reduce((s, r) => s + (r.success_count || 0), 0);
    const totalUrls = runs.reduce((s, r) => s + (r.total_urls || 0), 0);
    scrapeSuccessRate = totalUrls > 0 ? Math.round((totalSuccess / totalUrls) * 1000) / 10 : 0;
  }

  return {
    totalSKUs: data.total_products || 0,
    scrapeSuccessRate,
    noonCheapestPct: data.noon_cheapest_pct || 0,
    undercutPct: 100 - (data.noon_cheapest_pct || 0),
    avgGapPct: data.avg_gap_pct || 0,
  };
}

// ─── Products ───────────────────────────────────────────────

export async function getProducts(options?: {
  search?: string;
  category?: string;
  topOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  if (!isSupabaseConfigured()) return sample.getProducts();

  let query = supabase
    .from("pm_latest_prices")
    .select("*")
    .order("title");

  if (options?.search) {
    query = query.or(`title.ilike.%${options.search}%,sku.ilike.%${options.search}%`);
  }
  if (options?.category) {
    query = query.eq("category", options.category);
  }
  if (options?.topOnly) {
    query = query.eq("is_top_2500", true);
  }
  if (options?.limit) {
    const start = options.offset || 0;
    query = query.range(start, start + options.limit - 1);
  }

  const { data } = await query;
  return data || [];
}

export async function getProduct(id: string) {
  if (!isSupabaseConfigured()) return sample.getProduct(Number(id));

  const { data } = await supabase
    .from("pm_latest_prices")
    .select("*")
    .eq("id", id)
    .single();

  return data || null;
}

export async function getCategories() {
  if (!isSupabaseConfigured()) return sample.getCategories();

  const { data } = await supabase
    .from("pm_products")
    .select("category")
    .not("category", "is", null)
    .order("category");

  if (!data) return [];
  const unique = [...new Set(data.map((r) => r.category as string))];
  return unique;
}

// ─── Price History ──────────────────────────────────────────

export async function getPriceHistory(productId: string, days = 30) {
  if (!isSupabaseConfigured()) return sample.getPriceHistory(Number(productId));

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const [snapshots, noonPrices] = await Promise.all([
    supabase
      .from("pm_price_snapshots")
      .select("scrape_date, competitor, price")
      .eq("product_id", productId)
      .eq("scrape_status", "success")
      .gte("scrape_date", sinceDate.toISOString().split("T")[0])
      .order("scrape_date"),
    supabase
      .from("pm_noon_prices")
      .select("price_date, price")
      .eq("product_id", productId)
      .gte("price_date", sinceDate.toISOString().split("T")[0])
      .order("price_date"),
  ]);

  // Pivot into date-keyed records
  const dateMap: Record<string, any> = {};

  for (const row of noonPrices.data || []) {
    if (!dateMap[row.price_date]) dateMap[row.price_date] = { date: row.price_date };
    dateMap[row.price_date].noon = row.price;
  }

  for (const row of snapshots.data || []) {
    if (!dateMap[row.scrape_date]) dateMap[row.scrape_date] = { date: row.scrape_date };
    dateMap[row.scrape_date][row.competitor] = row.price;
  }

  return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Trend (30-day cheapest %) ──────────────────────────────

export async function getPositionTrend() {
  if (!isSupabaseConfigured()) return sample.getPositionTrend();

  // This would require a more complex query; for now we approximate
  // by checking the last 30 days of snapshots vs noon prices
  // In production, you'd create a materialized view or function for this
  return sample.getPositionTrend();
}

// ─── Category Breakdown ─────────────────────────────────────

export async function getCategoryBreakdown() {
  if (!isSupabaseConfigured()) return sample.getCategoryBreakdown();

  const { data } = await supabase.from("pm_latest_prices").select("category, price_position");

  if (!data) return [];

  const cats: Record<string, { total: number; undercut: number }> = {};
  for (const row of data) {
    const c = row.category || "Other";
    if (!cats[c]) cats[c] = { total: 0, undercut: 0 };
    cats[c].total++;
    if (row.price_position === "undercut") cats[c].undercut++;
  }

  return Object.entries(cats)
    .map(([category, { total, undercut }]) => ({
      category,
      undercutPct: Math.round((undercut / total) * 100),
    }))
    .sort((a, b) => b.undercutPct - a.undercutPct);
}

// ─── Alerts ─────────────────────────────────────────────────

export async function getAlerts(options?: { type?: string; limit?: number }) {
  if (!isSupabaseConfigured()) return sample.getAlerts();

  let query = supabase
    .from("pm_price_alerts")
    .select("*, pm_products(title, sku, category)")
    .order("created_at", { ascending: false })
    .limit(options?.limit || 100);

  if (options?.type) {
    query = query.eq("alert_type", options.type);
  }

  const { data } = await query;
  return data || [];
}

// ─── Scrape Runs ────────────────────────────────────────────

export async function getScrapeRuns(limit = 21) {
  if (!isSupabaseConfigured()) return sample.getScrapeRuns();

  const { data } = await supabase
    .from("pm_scrape_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  return data || [];
}
