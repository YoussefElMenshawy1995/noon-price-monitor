/**
 * Data fetching layer — uses Supabase when configured, falls back to sample data.
 * Transforms Supabase snake_case data to camelCase to match the UI interfaces.
 */

import { supabase } from "./supabase";
import * as sample from "./sample-data";
import type { Product, Alert, ScrapeRun } from "./sample-data";

/** Check if Supabase is configured */
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "undefined"
  );
}

// ─── Transformers ──────────────────────────────────────────

function toProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as number,
    sku: (row.sku as string) || "",
    title: (row.title as string) || "",
    category: (row.category as string) || "Other",
    brand: (row.brand as string) || "",
    isTop2500: (row.is_top_2500 as boolean) || false,
    noonPrice: row.noon_price != null ? Number(row.noon_price) : null,
    amazonPrice: row.amazon_price != null ? Number(row.amazon_price) : null,
    ninjaPrice: row.ninja_price != null ? Number(row.ninja_price) : null,
    luluPrice: row.lulu_price != null ? Number(row.lulu_price) : null,
    amazonInStock: (row.amazon_in_stock as boolean) ?? true,
    ninjaInStock: (row.ninja_in_stock as boolean) ?? true,
    luluInStock: (row.lulu_in_stock as boolean) ?? true,
    amazonPromo: (row.amazon_promo as string) || null,
    ninjaPromo: (row.ninja_promo as string) || null,
    luluPromo: (row.lulu_promo as string) || null,
    amazonDelivery: (row.amazon_delivery as string) || null,
    ninjaDelivery: (row.ninja_delivery as string) || null,
    luluDelivery: (row.lulu_delivery as string) || null,
  };
}

function toAlert(row: Record<string, unknown>): Alert {
  const joined = row.pm_products as Record<string, unknown> | null;
  return {
    id: row.id as number,
    productId: row.product_id as number,
    productTitle: (joined?.title as string) || "Unknown Product",
    category: (joined?.category as string) || "Other",
    competitor: (row.competitor as string) || "",
    alertType: (row.alert_type as Alert["alertType"]) || "price_drop",
    previousPrice: row.old_price != null ? Number(row.old_price) : null,
    currentPrice: row.new_price != null ? Number(row.new_price) : null,
    noonPrice: row.noon_price != null ? Number(row.noon_price) : null,
    changePct: row.pct_change != null ? Number(row.pct_change) : 0,
    message: (row.message as string) || "",
    alertDate: (row.alert_date as string) || "",
    isRead: (row.is_read as boolean) || false,
  };
}

function toScrapeRun(row: Record<string, unknown>): ScrapeRun {
  const startedAt = row.started_at as string | null;
  return {
    id: row.id as number,
    runDate: startedAt ? startedAt.split("T")[0] : "",
    competitor: (row.competitor as string) || "",
    status:
      row.status === "completed"
        ? "completed"
        : row.status === "failed"
          ? "failed"
          : "partial",
    totalUrls: (row.total_urls as number) || 0,
    successCount: (row.success_count as number) || 0,
    failedCount: (row.failed_count as number) || 0,
    blockedCount: (row.blocked_count as number) || 0,
    durationSecs: (row.duration_seconds as number) || 0,
  };
}

// ─── Overview Stats ─────────────────────────────────────────

export async function getStats() {
  if (!isSupabaseConfigured()) return sample.getStats();

  try {
    const { data } = await supabase.rpc("pm_get_price_position_summary");
    if (!data) return sample.getStats();

    // Get latest scrape run success rate
    const { data: runs } = await supabase
      .from("pm_scrape_runs")
      .select("success_count, total_urls")
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(3);

    let scrapeSuccessRate = 0;
    let trackedProducts = 0;
    if (runs && runs.length > 0) {
      const totalSuccess = runs.reduce(
        (s: number, r: Record<string, unknown>) => s + ((r.success_count as number) || 0),
        0,
      );
      const totalUrls = runs.reduce(
        (s: number, r: Record<string, unknown>) => s + ((r.total_urls as number) || 0),
        0,
      );
      scrapeSuccessRate = totalUrls > 0 ? Math.round((totalSuccess / totalUrls) * 1000) / 10 : 0;
      trackedProducts = totalUrls;
    }

    const noonCheapestPct = (data.noon_cheapest_pct as number) || 0;

    return {
      totalProducts: (data.total_products as number) || 0,
      trackedProducts,
      scrapeSuccessRate,
      noonCheapestPct,
      noonUndercutPct: Math.round(100 - noonCheapestPct),
      noonUndercutCount: (data.undercut_count as number) || 0,
      avgGapPct: (data.avg_gap_pct as number) || 0,
    };
  } catch {
    return sample.getStats();
  }
}

// ─── Products ───────────────────────────────────────────────

export async function getProducts(options?: {
  search?: string;
  category?: string;
  topOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Product[]> {
  if (!isSupabaseConfigured()) return sample.getProducts();

  try {
    let query = supabase.from("pm_latest_prices").select("*").order("title");

    if (options?.search) {
      query = query.or(
        `title.ilike.%${options.search}%,sku.ilike.%${options.search}%`,
      );
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
    if (!data || data.length === 0) return sample.getProducts();
    return data.map((row: Record<string, unknown>) => toProduct(row));
  } catch {
    return sample.getProducts();
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) return sample.getProduct(Number(id)) || null;

  try {
    const { data } = await supabase
      .from("pm_latest_prices")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) return sample.getProduct(Number(id)) || null;
    return toProduct(data as Record<string, unknown>);
  } catch {
    return sample.getProduct(Number(id)) || null;
  }
}

export async function getCategories(): Promise<string[]> {
  if (!isSupabaseConfigured()) return sample.getCategories();

  try {
    const { data } = await supabase
      .from("pm_products")
      .select("category")
      .not("category", "is", null)
      .order("category");

    if (!data || data.length === 0) return sample.getCategories();
    const unique = [
      ...new Set(data.map((r: Record<string, unknown>) => r.category as string)),
    ];
    return unique;
  } catch {
    return sample.getCategories();
  }
}

// ─── Price History ──────────────────────────────────────────

export async function getPriceHistory(
  productId: string,
  days = 30,
): Promise<{ date: string; noon: number | null; amazon: number | null; ninja: number | null; lulu: number | null }[]> {
  if (!isSupabaseConfigured()) return sample.getPriceHistory(Number(productId));

  try {
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
    const dateMap: Record<
      string,
      { date: string; noon: number | null; amazon: number | null; ninja: number | null; lulu: number | null }
    > = {};

    for (const row of noonPrices.data || []) {
      const r = row as Record<string, unknown>;
      const d = r.price_date as string;
      if (!dateMap[d]) dateMap[d] = { date: d, noon: null, amazon: null, ninja: null, lulu: null };
      dateMap[d].noon = r.price != null ? Number(r.price) : null;
    }

    for (const row of snapshots.data || []) {
      const r = row as Record<string, unknown>;
      const d = r.scrape_date as string;
      if (!dateMap[d]) dateMap[d] = { date: d, noon: null, amazon: null, ninja: null, lulu: null };
      const comp = r.competitor as string;
      if (comp === "amazon" || comp === "ninja" || comp === "lulu") {
        dateMap[d][comp] = r.price != null ? Number(r.price) : null;
      }
    }

    const result = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
    if (result.length === 0) return sample.getPriceHistory(Number(productId));
    return result;
  } catch {
    return sample.getPriceHistory(Number(productId));
  }
}

// ─── Trend (30-day cheapest %) ──────────────────────────────

export async function getPositionTrend() {
  // For now, always use sample data for the trend chart
  // A proper implementation would use a materialized view
  return sample.getPositionTrend();
}

// ─── Category Breakdown ─────────────────────────────────────

export async function getCategoryBreakdown() {
  if (!isSupabaseConfigured()) return sample.getCategoryBreakdown();

  try {
    const { data } = await supabase
      .from("pm_latest_prices")
      .select("category, price_position");

    if (!data || data.length === 0) return sample.getCategoryBreakdown();

    const cats: Record<string, { total: number; undercut: number }> = {};
    for (const row of data) {
      const r = row as Record<string, unknown>;
      const c = (r.category as string) || "Other";
      if (!cats[c]) cats[c] = { total: 0, undercut: 0 };
      cats[c].total++;
      if (r.price_position === "undercut") cats[c].undercut++;
    }

    return Object.entries(cats)
      .map(([category, { total, undercut }]) => ({
        category,
        total,
        undercut,
        undercutPct: total > 0 ? Math.round((undercut / total) * 100) : 0,
      }))
      .sort((a, b) => b.undercutPct - a.undercutPct);
  } catch {
    return sample.getCategoryBreakdown();
  }
}

// ─── Alerts ─────────────────────────────────────────────────

export async function getAlerts(options?: {
  type?: string;
  limit?: number;
}): Promise<Alert[]> {
  if (!isSupabaseConfigured()) return sample.getAlerts();

  try {
    let query = supabase
      .from("pm_price_alerts")
      .select("*, pm_products(title, sku, category)")
      .order("created_at", { ascending: false })
      .limit(options?.limit || 100);

    if (options?.type) {
      query = query.eq("alert_type", options.type);
    }

    const { data } = await query;
    if (!data || data.length === 0) return sample.getAlerts();
    return data.map((row: Record<string, unknown>) => toAlert(row));
  } catch {
    return sample.getAlerts();
  }
}

// ─── Scrape Runs ────────────────────────────────────────────

export async function getScrapeRuns(limit = 21): Promise<ScrapeRun[]> {
  if (!isSupabaseConfigured()) return sample.getScrapeRuns();

  try {
    const { data } = await supabase
      .from("pm_scrape_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (!data || data.length === 0) return sample.getScrapeRuns();
    return data.map((row: Record<string, unknown>) => toScrapeRun(row));
  } catch {
    return sample.getScrapeRuns();
  }
}
