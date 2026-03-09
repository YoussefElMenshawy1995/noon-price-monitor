# Noon Minutes Price Monitor

Daily competitive price monitoring: Noon Minutes vs Amazon Now, Ninja, and Lulu Hypermarket.

## What's Included

```
noon-price-monitor/
  migrations/          — SQL files for Supabase database
  scraper/             — Python scrapers + product import
  dashboard/           — Next.js web dashboard
  supabase/functions/  — Edge Function for email digest
  .github/workflows/   — GitHub Actions daily scrape
```

## Architecture

```
GitHub Actions (daily 6 AM Riyadh)
  -> Python scraper (httpx + selectolax)
  -> Supabase PostgreSQL
  -> Next.js Dashboard on Vercel
  -> Email digest via Supabase Edge Function + Resend
```

All free-tier services.

---

## Setup Guide

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Pick a region close to Saudi Arabia (e.g., `eu-central-1` Frankfurt or `ap-south-1` Mumbai)
3. Save your **project URL** and **anon key** (Settings > API)
4. Save your **service role key** (Settings > API > service_role — keep secret!)

### Step 2: Run Database Migrations

In the Supabase Dashboard, go to **SQL Editor** and run these files in order:

1. `migrations/001_create_tables.sql` — creates 5 tables
2. `migrations/002_views_and_functions.sql` — creates the `pm_latest_prices` view and stats function
3. `migrations/003_rls_and_cleanup.sql` — enables RLS policies

Optional: Enable the `pg_cron` extension (Database > Extensions > search "pg_cron" > enable), then run the cleanup schedules at the bottom of `003_rls_and_cleanup.sql` to auto-delete data older than 90 days.

### Step 3: Import Products from Excel

1. Install Python 3.10+ and run:
   ```bash
   cd scraper
   pip install -r requirements.txt
   ```

2. Upload the Excel file:
   ```bash
   export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   export SUPABASE_SERVICE_KEY=eyJ...your-service-role-key
   python upload_products.py "/path/to/Final Comp data.xlsx"
   ```

3. Verify: In Supabase, run `SELECT COUNT(*) FROM pm_products` — should be ~12,234.

### Step 4: Deploy Dashboard to Vercel

1. Push this entire `noon-price-monitor` folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com), import the repo
3. Set the **Root Directory** to `dashboard`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `SUPABASE_URL` = same URL (for server-side API routes)
   - `SUPABASE_SERVICE_KEY` = your service role key
5. Deploy!

### Step 5: Set Up Daily Scraper (GitHub Actions)

1. In your GitHub repo, go to **Settings > Secrets and variables > Actions**
2. Add these secrets:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_KEY` = your service role key
3. The workflow runs daily at 3 AM UTC (6 AM Riyadh). You can also trigger it manually from the **Actions** tab.

**Important:** The repo must be **public** for unlimited free GitHub Actions minutes.

### Step 6: Set Up Email Digest (Optional)

1. Create a [Resend](https://resend.com) account (free: 100 emails/day)
2. Verify your domain or use their test domain
3. In Supabase Dashboard, go to **Edge Functions** and deploy:
   ```bash
   supabase functions deploy daily-digest --project-ref YOUR_PROJECT_REF
   ```
   Or manually paste the code from `supabase/functions/daily-digest/index.ts`

4. Set Edge Function secrets in Supabase Dashboard (Edge Functions > daily-digest > Secrets):
   - `RESEND_API_KEY` = your Resend API key
   - `DIGEST_RECIPIENTS` = comma-separated emails (e.g., `youssef@noon.com,team@noon.com`)
   - `DIGEST_FROM_EMAIL` = your verified sender (e.g., `Price Monitor <alerts@yourdomain.com>`)
   - `DASHBOARD_URL` = your Vercel URL

### Step 7: Upload Noon Prices

Noon prices are uploaded via CSV at `/upload` in the dashboard.

**CSV format:**
```
sku,price,original_price,in_stock,promo_label
Z123ABC456,49.95,54.90,true,
Z789DEF012,29.00,29.00,true,Buy 2 Get 1
```

- `sku` (required) — must match a SKU in `pm_products`
- `price` (required) — current selling price in SAR
- `original_price` (optional) — original/list price
- `in_stock` (optional) — true/false, defaults to true
- `promo_label` (optional) — any active promotion text

---

## How It Works

### Daily Scrape Flow
1. GitHub Actions triggers at 6 AM Riyadh time
2. Python scraper runs sequentially: Ninja (~5 min), Lulu (~8 min), Amazon (~46 min)
3. Results are upserted into `pm_price_snapshots`
4. Alert generator compares today vs yesterday — creates alerts for >5% changes
5. Email digest Edge Function sends summary to the team

### Dashboard Pages
- **Overview** — KPI cards, price position chart, trends, top undercuts
- **Price Compare** — searchable/filterable comparison table
- **Product Detail** — per-product price history and competitor cards
- **Alerts** — filterable feed of price changes, stock changes, promos
- **Upload Noon Prices** — CSV upload for Noon's internal prices
- **Scrape Status** — scrape health, success rates, run history

### Fallback Mode
The dashboard works with sample data when Supabase is not configured. This lets you preview the UI locally without any backend.

---

## Manual Scrape

To run the scraper manually (not via GitHub Actions):

```bash
cd scraper
export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export SUPABASE_SERVICE_KEY=eyJ...

# All competitors
python main.py

# Single competitor
python main.py --competitor amazon
python main.py --competitor ninja
python main.py --competitor lulu
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Scraper returns many "blocked" | Amazon detects bots. Reduce `AMAZON_CONCURRENCY` in `config.py` to 3 |
| Ninja/Lulu prices not found | Site HTML may have changed. Check CSS selectors in the scraper files |
| Dashboard shows sample data | Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars |
| Upload API returns 500 | Set `SUPABASE_SERVICE_KEY` env var (server-side, not public) |
| Email not sending | Check `RESEND_API_KEY` and `DIGEST_RECIPIENTS` in Edge Function secrets |
| Database nearing 500MB | Enable `pg_cron` and run the cleanup schedules from migration 003 |

---

## Data Retention

- Price snapshots and alerts are kept for **90 days**
- Enable `pg_cron` in Supabase to auto-cleanup (see migration 003)
- Storage budget: ~3.6 MB/day = ~324 MB at 90 days (within free tier 500MB)

## Phase 2: Barcode Discovery (Future)

For unmapped products (~61% of Amazon, ~14% of Ninja, ~6% of Lulu):
- Provide barcode/EAN data
- Weekly job searches competitor sites by barcode
- Auto-maps products with exact matches
