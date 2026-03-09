import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/upload-noon-prices
 * Body: JSON array of { sku, price, original_price?, in_stock?, promo_label? }
 * Uses SUPABASE_SERVICE_KEY (server-side only) to write to pm_noon_prices.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const rows: Array<{
      sku: string;
      price: number;
      original_price?: number;
      in_stock?: boolean;
      promo_label?: string;
    }> = await request.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Expected a non-empty JSON array" }, { status: 400 });
    }

    // Look up SKU -> product ID
    const skus = rows.map((r) => r.sku).filter(Boolean);
    const { data: products } = await supabase
      .from("pm_products")
      .select("id, sku")
      .in("sku", skus);

    const skuMap = new Map<string, number>();
    for (const p of products || []) {
      skuMap.set(p.sku, p.id);
    }

    const today = new Date().toISOString().split("T")[0];
    const toUpsert = [];
    const notFound: string[] = [];

    for (const row of rows) {
      const productId = skuMap.get(row.sku);
      if (!productId) {
        notFound.push(row.sku);
        continue;
      }
      toUpsert.push({
        product_id: productId,
        price_date: today,
        price: row.price,
        original_price: row.original_price ?? null,
        in_stock: row.in_stock ?? true,
        promo_label: row.promo_label ?? null,
      });
    }

    // Batch upsert in chunks of 500
    let upserted = 0;
    for (let i = 0; i < toUpsert.length; i += 500) {
      const batch = toUpsert.slice(i, i + 500);
      await supabase
        .from("pm_noon_prices")
        .upsert(batch, { onConflict: "product_id,price_date" });
      upserted += batch.length;
    }

    return NextResponse.json({
      success: true,
      uploaded: upserted,
      skipped: notFound.length,
      notFoundSkus: notFound.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
