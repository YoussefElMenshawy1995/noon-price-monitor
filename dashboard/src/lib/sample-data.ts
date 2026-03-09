// Realistic sample data based on actual products from Final Comp data.xlsx

export interface Product {
  id: number;
  sku: string;
  title: string;
  category: string;
  brand: string;
  isTop2500: boolean;
  noonPrice: number | null;
  amazonPrice: number | null;
  ninjaPrice: number | null;
  luluPrice: number | null;
  amazonInStock: boolean;
  ninjaInStock: boolean;
  luluInStock: boolean;
  amazonPromo: string | null;
  ninjaPromo: string | null;
  luluPromo: string | null;
  amazonDelivery: string | null;
  ninjaDelivery: string | null;
  luluDelivery: string | null;
}

export interface Alert {
  id: number;
  productId: number;
  productTitle: string;
  category: string;
  competitor: string;
  alertType: 'price_drop' | 'price_increase' | 'out_of_stock' | 'back_in_stock' | 'undercut' | 'new_promo';
  previousPrice: number | null;
  currentPrice: number | null;
  noonPrice: number | null;
  changePct: number;
  message: string;
  alertDate: string;
  isRead: boolean;
}

export interface ScrapeRun {
  id: number;
  runDate: string;
  competitor: string;
  status: 'completed' | 'partial' | 'failed';
  totalUrls: number;
  successCount: number;
  failedCount: number;
  blockedCount: number;
  durationSecs: number;
}

export interface PriceHistory {
  date: string;
  noon: number | null;
  amazon: number | null;
  ninja: number | null;
  lulu: number | null;
}

const categories = [
  'Baby Care', 'Baby Food', 'Dairy', 'Beverages', 'Snacks',
  'Frozen Food', 'Cleaning', 'Personal Care', 'Grocery', 'Rice & Grains'
];

const products: Product[] = [
  { id: 1, sku: 'ZD8D524CF775916C8447DZ-1', title: 'BabyJoy Compressed Diamond Junior Diapers Size 5 (14-25kg) 36pcs', category: 'Baby Care', brand: 'BabyJoy', isTop2500: true, noonPrice: 54.90, amazonPrice: 52.50, ninjaPrice: 55.00, luluPrice: 49.95, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: '5% coupon', ninjaPromo: null, luluPromo: 'Buy 2 Save 10%', amazonDelivery: 'Tomorrow', ninjaDelivery: '30 min', luluDelivery: 'Same day' },
  { id: 2, sku: 'ZA1B2C3D4E5F6G7H8I9JZ-1', title: 'Similac Gold Formula Infant Powder Stage 1 (0-6m) 800g', category: 'Baby Food', brand: 'Similac', isTop2500: true, noonPrice: 89.00, amazonPrice: 85.50, ninjaPrice: 92.00, luluPrice: 87.25, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '25 min', luluDelivery: 'Same day' },
  { id: 3, sku: 'ZEDFD918C90BD58DAF525Z-1', title: 'Rahima Fresh Large Eggs Tray 30pcs', category: 'Dairy', brand: 'Rahima', isTop2500: true, noonPrice: 18.50, amazonPrice: null, ninjaPrice: 17.95, luluPrice: 18.00, amazonInStock: false, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: null, ninjaDelivery: '20 min', luluDelivery: 'Same day' },
  { id: 4, sku: 'Z222729D2E1CDB3ACAD5BZ-1', title: 'Pampers Premium Care Taped Diapers Size 4 (9-14kg) Jumbo Box 88pcs', category: 'Baby Care', brand: 'Pampers', isTop2500: true, noonPrice: 99.00, amazonPrice: 94.50, ninjaPrice: 98.00, luluPrice: 95.00, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: '10% off', ninjaPromo: 'Flash Deal', luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '30 min', luluDelivery: 'Same day' },
  { id: 5, sku: 'Z3F4G5H6I7J8K9L0M1N2Z-1', title: 'Aquafina Bottled Drinking Water 1.5L x 6', category: 'Beverages', brand: 'Aquafina', isTop2500: true, noonPrice: 6.75, amazonPrice: 8.00, ninjaPrice: 7.25, luluPrice: 7.00, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '15 min', luluDelivery: 'Same day' },
  { id: 6, sku: 'Z4A5B6C7D8E9F0G1H2I3Z-1', title: 'Nutella Hazelnut Spread with Cocoa 750g', category: 'Snacks', brand: 'Nutella', isTop2500: true, noonPrice: 35.50, amazonPrice: 36.75, ninjaPrice: 39.00, luluPrice: 37.50, amazonInStock: true, ninjaInStock: false, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: 'Offer', amazonDelivery: 'Tomorrow', ninjaDelivery: null, luluDelivery: 'Same day' },
  { id: 7, sku: 'Z5B6C7D8E9F0G1H2I3J4Z-1', title: 'Seara Shawerma Chicken Frozen 600g', category: 'Frozen Food', brand: 'Seara', isTop2500: true, noonPrice: 19.50, amazonPrice: null, ninjaPrice: 21.50, luluPrice: 20.75, amazonInStock: false, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: null, ninjaDelivery: '25 min', luluDelivery: 'Same day' },
  { id: 8, sku: 'Z6C7D8E9F0G1H2I3J4K5Z-1', title: 'Dettol Antiseptic Disinfectant Liquid 1L', category: 'Cleaning', brand: 'Dettol', isTop2500: true, noonPrice: 29.95, amazonPrice: 27.50, ninjaPrice: 30.50, luluPrice: 28.00, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '30 min', luluDelivery: 'Same day' },
  { id: 9, sku: 'Z7D8E9F0G1H2I3J4K5L6Z-1', title: 'Anchor Full Cream Milk Powder 2.25kg', category: 'Dairy', brand: 'Anchor', isTop2500: true, noonPrice: 69.00, amazonPrice: 65.50, ninjaPrice: 70.00, luluPrice: 64.00, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: 'Weekly Deal', amazonDelivery: 'Tomorrow', ninjaDelivery: '30 min', luluDelivery: 'Same day' },
  { id: 10, sku: 'Z8E9F0G1H2I3J4K5L6M7Z-1', title: 'Galaxy Dark Chocolate Kunafa 120g', category: 'Snacks', brand: 'Galaxy', isTop2500: true, noonPrice: 10.50, amazonPrice: 11.75, ninjaPrice: 12.00, luluPrice: 11.50, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '20 min', luluDelivery: 'Same day' },
  { id: 11, sku: 'Z9F0G1H2I3J4K5L6M7N8Z-1', title: 'WaterWipes Original Baby Wipes 60pcs x 3', category: 'Baby Care', brand: 'WaterWipes', isTop2500: true, noonPrice: 44.00, amazonPrice: 42.00, ninjaPrice: 43.50, luluPrice: 41.00, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: '15% off', ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '25 min', luluDelivery: 'Same day' },
  { id: 12, sku: 'ZAG1H2I3J4K5L6M7N8O9Z-1', title: 'Afia Pure Corn Oil 1.5L', category: 'Grocery', brand: 'Afia', isTop2500: true, noonPrice: 18.00, amazonPrice: 17.25, ninjaPrice: 18.50, luluPrice: 17.00, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '20 min', luluDelivery: 'Same day' },
  { id: 13, sku: 'ZBH2I3J4K5L6M7N8O9P0Z-1', title: 'Al-Muhaidib Premium Basmati Rice 5kg', category: 'Rice & Grains', brand: 'Al-Muhaidib', isTop2500: true, noonPrice: 42.00, amazonPrice: 39.50, ninjaPrice: 43.00, luluPrice: 40.00, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '30 min', luluDelivery: 'Same day' },
  { id: 14, sku: 'ZCI3J4K5L6M7N8O9P0Q1Z-1', title: 'Huggies Extra Care Diapers Size 3 (4-9kg) Jumbo 76pcs', category: 'Baby Care', brand: 'Huggies', isTop2500: true, noonPrice: 79.00, amazonPrice: 74.50, ninjaPrice: 80.00, luluPrice: 76.00, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '25 min', luluDelivery: 'Same day' },
  { id: 15, sku: 'ZDJ4K5L6M7N8O9P0Q1R2Z-1', title: 'Sudocrem Antiseptic Healing Cream 250g', category: 'Personal Care', brand: 'Sudocrem', isTop2500: true, noonPrice: 35.00, amazonPrice: 32.00, ninjaPrice: 36.00, luluPrice: 33.50, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '20 min', luluDelivery: 'Same day' },
  { id: 16, sku: 'ZEK5L6M7N8O9P0Q1R2S3Z-1', title: "Kellogg's Corn Flakes Original 500g", category: 'Grocery', brand: "Kellogg's", isTop2500: true, noonPrice: 14.90, amazonPrice: 15.75, ninjaPrice: 16.00, luluPrice: 15.50, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '20 min', luluDelivery: 'Same day' },
  { id: 17, sku: 'ZFL6M7N8O9P0Q1R2S3T4Z-1', title: 'Aptamil Gold Advance Infant Formula Stage 1 400g', category: 'Baby Food', brand: 'Aptamil', isTop2500: true, noonPrice: 52.00, amazonPrice: 49.00, ninjaPrice: 53.00, luluPrice: 50.00, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '25 min', luluDelivery: 'Same day' },
  { id: 18, sku: 'ZGM7N8O9P0Q1R2S3T4U5Z-1', title: 'Berain Bottled Drinking Water 330ml x 40', category: 'Beverages', brand: 'Berain', isTop2500: false, noonPrice: 15.00, amazonPrice: null, ninjaPrice: 14.50, luluPrice: 14.00, amazonInStock: false, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: null, ninjaDelivery: '20 min', luluDelivery: 'Same day' },
  { id: 19, sku: 'ZHN8O9P0Q1R2S3T4U5V6Z-1', title: 'Fairy Plus Original Dishwashing Liquid 1.25L', category: 'Cleaning', brand: 'Fairy', isTop2500: true, noonPrice: 17.50, amazonPrice: 18.00, ninjaPrice: 20.00, luluPrice: 18.50, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '20 min', luluDelivery: 'Same day' },
  { id: 20, sku: 'ZIO9P0Q1R2S3T4U5V6W7Z-1', title: 'Nido Full Cream Milk Powder 900g', category: 'Dairy', brand: 'Nido', isTop2500: true, noonPrice: 36.00, amazonPrice: 34.50, ninjaPrice: 37.00, luluPrice: 35.00, amazonInStock: true, ninjaInStock: true, luluInStock: true, amazonPromo: null, ninjaPromo: null, luluPromo: null, amazonDelivery: 'Tomorrow', ninjaDelivery: '25 min', luluDelivery: 'Same day' },
];

export function getProducts(): Product[] {
  return products;
}

export function getProduct(id: number): Product | undefined {
  return products.find(p => p.id === id);
}

export function getCategories(): string[] {
  return categories;
}

// Compute stats
export function getStats() {
  const total = products.length;
  const withNoonPrice = products.filter(p => p.noonPrice !== null);

  let noonCheapest = 0;
  let noonUndercut = 0;
  let totalGap = 0;
  let gapCount = 0;

  for (const p of withNoonPrice) {
    const competitors = [p.amazonPrice, p.ninjaPrice, p.luluPrice].filter(Boolean) as number[];
    if (competitors.length === 0) continue;
    const cheapest = Math.min(...competitors);

    if (p.noonPrice! <= cheapest) {
      noonCheapest++;
    } else {
      noonUndercut++;
      totalGap += ((p.noonPrice! - cheapest) / p.noonPrice!) * 100;
      gapCount++;
    }
  }

  return {
    totalProducts: 12234,
    trackedProducts: 15700,
    scrapeSuccessRate: 94.2,
    noonCheapestPct: Math.round((noonCheapest / withNoonPrice.length) * 100),
    noonUndercutPct: Math.round((noonUndercut / withNoonPrice.length) * 100),
    noonUndercutCount: noonUndercut,
    avgGapPct: gapCount > 0 ? parseFloat((totalGap / gapCount).toFixed(1)) : 0,
  };
}

// Generate 30-day price history for a product
export function getPriceHistory(productId: number): PriceHistory[] {
  const product = getProduct(productId);
  if (!product) return [];

  const history: PriceHistory[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const variance = () => 0.95 + Math.random() * 0.1; // +/- 5%

    history.push({
      date: dateStr,
      noon: product.noonPrice ? parseFloat((product.noonPrice * variance()).toFixed(2)) : null,
      amazon: product.amazonPrice ? parseFloat((product.amazonPrice * variance()).toFixed(2)) : null,
      ninja: product.ninjaPrice ? parseFloat((product.ninjaPrice * variance()).toFixed(2)) : null,
      lulu: product.luluPrice ? parseFloat((product.luluPrice * variance()).toFixed(2)) : null,
    });
  }

  return history;
}

// Price position trend (30 days)
export function getPositionTrend(): { date: string; noonCheapestPct: number }[] {
  const trend = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    trend.push({
      date: date.toISOString().split('T')[0],
      noonCheapestPct: Math.round(25 + Math.random() * 20), // 25-45%
    });
  }
  return trend;
}

// Category breakdown
export function getCategoryBreakdown() {
  return categories.map(cat => {
    const catProducts = products.filter(p => p.category === cat);
    const undercut = catProducts.filter(p => {
      if (!p.noonPrice) return false;
      const comp = [p.amazonPrice, p.ninjaPrice, p.luluPrice].filter(Boolean) as number[];
      return comp.length > 0 && Math.min(...comp) < p.noonPrice;
    }).length;
    return {
      category: cat,
      total: catProducts.length || Math.floor(Math.random() * 500 + 100),
      undercut: undercut || Math.floor(Math.random() * 30 + 5),
      undercutPct: catProducts.length > 0 ? Math.round((undercut / catProducts.length) * 100) : Math.floor(Math.random() * 30 + 10),
    };
  });
}

// Sample alerts
export function getAlerts(): Alert[] {
  return [
    { id: 1, productId: 1, productTitle: 'BabyJoy Compressed Diamond Junior Diapers Size 5', category: 'Baby Care', competitor: 'lulu', alertType: 'undercut', previousPrice: 52.00, currentPrice: 49.95, noonPrice: 54.90, changePct: -3.9, message: 'Lulu dropped price to SAR 49.95 — now SAR 4.95 cheaper than Noon', alertDate: '2026-03-09', isRead: false },
    { id: 2, productId: 4, productTitle: 'Pampers Premium Care Taped Diapers Size 4 Jumbo', category: 'Baby Care', competitor: 'amazon', alertType: 'new_promo', previousPrice: null, currentPrice: 94.50, noonPrice: 99.00, changePct: 0, message: 'Amazon added "10% off" promo on Pampers — now SAR 94.50', alertDate: '2026-03-09', isRead: false },
    { id: 3, productId: 9, productTitle: 'Anchor Full Cream Milk Powder 2.25kg', category: 'Dairy', competitor: 'lulu', alertType: 'price_drop', previousPrice: 67.00, currentPrice: 64.00, noonPrice: 69.00, changePct: -4.5, message: 'Lulu dropped Anchor Milk Powder from SAR 67 to SAR 64 (-4.5%)', alertDate: '2026-03-09', isRead: false },
    { id: 4, productId: 6, productTitle: 'Nutella Hazelnut Spread 750g', category: 'Snacks', competitor: 'ninja', alertType: 'out_of_stock', previousPrice: 39.00, currentPrice: null, noonPrice: 38.50, changePct: 0, message: 'Nutella 750g is now out of stock on Ninja', alertDate: '2026-03-09', isRead: false },
    { id: 5, productId: 11, productTitle: 'WaterWipes Original Baby Wipes 60pcs x 3', category: 'Baby Care', competitor: 'amazon', alertType: 'price_drop', previousPrice: 45.00, currentPrice: 42.00, noonPrice: 44.00, changePct: -6.7, message: 'Amazon dropped WaterWipes from SAR 45 to SAR 42 (-6.7%)', alertDate: '2026-03-08', isRead: true },
    { id: 6, productId: 13, productTitle: 'Al-Muhaidib Premium Basmati Rice 5kg', category: 'Rice & Grains', competitor: 'amazon', alertType: 'undercut', previousPrice: 41.00, currentPrice: 39.50, noonPrice: 42.00, changePct: -3.7, message: 'Amazon undercuts Noon on Basmati Rice by SAR 2.50', alertDate: '2026-03-08', isRead: true },
    { id: 7, productId: 7, productTitle: 'Seara Shawerma Chicken Frozen 600g', category: 'Frozen Food', competitor: 'lulu', alertType: 'price_increase', previousPrice: 19.50, currentPrice: 20.75, noonPrice: 22.00, changePct: 6.4, message: 'Lulu increased Seara Shawerma from SAR 19.50 to SAR 20.75 (+6.4%)', alertDate: '2026-03-08', isRead: true },
    { id: 8, productId: 3, productTitle: 'Rahima Fresh Large Eggs Tray 30pcs', category: 'Dairy', competitor: 'amazon', alertType: 'back_in_stock', previousPrice: null, currentPrice: 19.00, noonPrice: 18.50, changePct: 0, message: 'Rahima Eggs back in stock on Amazon at SAR 19.00', alertDate: '2026-03-07', isRead: true },
  ];
}

// Sample scrape runs (last 7 days)
export function getScrapeRuns(): ScrapeRun[] {
  const runs: ScrapeRun[] = [];
  const today = new Date();
  const competitors = ['amazon', 'ninja', 'lulu'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    for (const comp of competitors) {
      const total = comp === 'amazon' ? 3900 : comp === 'ninja' ? 4400 : 7400;
      const successRate = comp === 'amazon' ? 0.85 + Math.random() * 0.1 : 0.92 + Math.random() * 0.07;
      const success = Math.round(total * successRate);
      const blocked = comp === 'amazon' ? Math.round(total * 0.05 * Math.random()) : 0;
      const failed = total - success - blocked;

      runs.push({
        id: runs.length + 1,
        runDate: dateStr,
        competitor: comp,
        status: successRate > 0.8 ? 'completed' : 'partial',
        totalUrls: total,
        successCount: success,
        failedCount: Math.max(0, failed),
        blockedCount: blocked,
        durationSecs: comp === 'amazon' ? 2700 + Math.round(Math.random() * 300) : comp === 'ninja' ? 280 + Math.round(Math.random() * 40) : 470 + Math.round(Math.random() * 60),
      });
    }
  }
  return runs;
}
