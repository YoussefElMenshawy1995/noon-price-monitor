import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Email recipients — add team emails here
const RECIPIENTS = (Deno.env.get("DIGEST_RECIPIENTS") || "").split(",").filter(Boolean);

// Sender — must be verified in Resend
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") || "Noon Price Monitor <noreply@yourdomain.com>";

Deno.serve(async (req: Request) => {
  try {
    if (RECIPIENTS.length === 0) {
      return new Response(
        JSON.stringify({ error: "No DIGEST_RECIPIENTS configured" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get price position summary
    const { data: summary } = await supabase.rpc("pm_get_price_position_summary");

    // Get today's scrape runs
    const today = new Date().toISOString().split("T")[0];
    const { data: runs } = await supabase
      .from("pm_scrape_runs")
      .select("*")
      .gte("started_at", `${today}T00:00:00`)
      .order("started_at", { ascending: true });

    // Get today's alerts
    const { data: alerts } = await supabase
      .from("pm_price_alerts")
      .select("*, pm_products(title, sku)")
      .eq("alert_date", today)
      .order("created_at", { ascending: false })
      .limit(50);

    // Build email HTML
    const html = buildEmailHtml(summary, runs || [], alerts || []);

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: RECIPIENTS,
        subject: `Noon Price Monitor — Daily Digest (${today})`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend API error: ${res.status} ${err}`);
    }

    const result = await res.json();
    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildEmailHtml(summary: any, runs: any[], alerts: any[]): string {
  const s = summary || {};

  // Scrape health table rows
  const runRows = runs
    .map(
      (r) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-transform:capitalize">${r.competitor}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${r.status === "completed" ? "✅" : "❌"} ${r.status}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${r.success_count}/${r.total_urls}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${r.duration_seconds ? Math.round(r.duration_seconds / 60) + "m" : "—"}</td>
    </tr>`
    )
    .join("");

  // Alert rows (top 20)
  const alertRows = alerts
    .slice(0, 20)
    .map((a) => {
      const product = a.pm_products;
      const typeColors: Record<string, string> = {
        price_drop: "#16a34a",
        price_increase: "#dc2626",
        out_of_stock: "#9333ea",
        back_in_stock: "#2563eb",
        undercut: "#ea580c",
        new_promo: "#ca8a04",
      };
      const color = typeColors[a.alert_type] || "#6b7280";
      return `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">
        <span style="background:${color};color:white;padding:2px 8px;border-radius:10px;font-size:11px">${a.alert_type.replace("_", " ")}</span>
      </td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${product?.title?.slice(0, 40) || a.product_id}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-transform:capitalize">${a.competitor}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${a.message?.slice(0, 60) || "—"}</td>
    </tr>`;
    })
    .join("");

  // Top undercuts
  const undercuts = (s.top_undercuts || []) as any[];
  const undercutRows = undercuts
    .map(
      (u) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${u.title?.slice(0, 40)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">SAR ${u.noon_price}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">SAR ${u.cheapest_competitor_price}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;color:#dc2626;font-weight:bold">${u.price_gap_pct}%</td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1f2937">
  <h1 style="color:#f59e0b;margin-bottom:4px">Noon Minutes Price Monitor</h1>
  <p style="color:#6b7280;margin-top:0">Daily Digest — ${new Date().toLocaleDateString("en-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>

  <h2 style="border-bottom:2px solid #f59e0b;padding-bottom:6px">Price Position</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr>
      <td style="padding:12px;background:#f0fdf4;border-radius:8px;text-align:center;width:33%">
        <div style="font-size:28px;font-weight:bold;color:#16a34a">${s.noon_cheapest_pct ?? "—"}%</div>
        <div style="font-size:12px;color:#6b7280">Noon Cheapest</div>
      </td>
      <td style="width:8px"></td>
      <td style="padding:12px;background:#fef2f2;border-radius:8px;text-align:center;width:33%">
        <div style="font-size:28px;font-weight:bold;color:#dc2626">${s.undercut_count ?? "—"}</div>
        <div style="font-size:12px;color:#6b7280">Products Undercut</div>
      </td>
      <td style="width:8px"></td>
      <td style="padding:12px;background:#fff7ed;border-radius:8px;text-align:center;width:33%">
        <div style="font-size:28px;font-weight:bold;color:#ea580c">${s.avg_gap_pct ?? "—"}%</div>
        <div style="font-size:12px;color:#6b7280">Avg Price Gap</div>
      </td>
    </tr>
  </table>

  <h2 style="border-bottom:2px solid #f59e0b;padding-bottom:6px">Scrape Health</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:8px 12px;text-align:left">Competitor</th>
        <th style="padding:8px 12px;text-align:left">Status</th>
        <th style="padding:8px 12px;text-align:left">Success</th>
        <th style="padding:8px 12px;text-align:left">Duration</th>
      </tr>
    </thead>
    <tbody>${runRows || '<tr><td colspan="4" style="padding:12px;color:#9ca3af">No scrape runs today</td></tr>'}</tbody>
  </table>

  ${
    undercutRows
      ? `
  <h2 style="border-bottom:2px solid #f59e0b;padding-bottom:6px">Top 10 Undercuts</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:8px 12px;text-align:left">Product</th>
        <th style="padding:8px 12px;text-align:left">Noon</th>
        <th style="padding:8px 12px;text-align:left">Competitor</th>
        <th style="padding:8px 12px;text-align:left">Gap</th>
      </tr>
    </thead>
    <tbody>${undercutRows}</tbody>
  </table>`
      : ""
  }

  ${
    alertRows
      ? `
  <h2 style="border-bottom:2px solid #f59e0b;padding-bottom:6px">Today's Alerts (${alerts.length})</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:8px 12px;text-align:left">Type</th>
        <th style="padding:8px 12px;text-align:left">Product</th>
        <th style="padding:8px 12px;text-align:left">Competitor</th>
        <th style="padding:8px 12px;text-align:left">Details</th>
      </tr>
    </thead>
    <tbody>${alertRows}</tbody>
  </table>`
      : ""
  }

  <p style="color:#9ca3af;font-size:12px;margin-top:30px;border-top:1px solid #e5e7eb;padding-top:12px">
    Noon Minutes Price Monitor — Automated daily digest<br>
    <a href="${Deno.env.get("DASHBOARD_URL") || "#"}" style="color:#f59e0b">Open Dashboard</a>
  </p>
</body>
</html>`;
}
