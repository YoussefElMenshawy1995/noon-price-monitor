"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import * as sample from "@/lib/sample-data";
import { formatSAR } from "@/lib/utils";
import Link from "next/link";

type Competitor = "all" | "amazon" | "ninja" | "lulu";

const COMPETITOR_LABELS: Record<Competitor, string> = {
  all: "All Competitors",
  amazon: "Amazon",
  ninja: "Ninja",
  lulu: "Lulu",
};

const COMPETITOR_COLORS: Record<string, string> = {
  amazon: "text-orange-500",
  ninja: "text-emerald-600",
  lulu: "text-rose-600",
};

export default function ComparePage() {
  const [allProducts, setAllProducts] = useState<sample.Product[]>(sample.getProducts());
  const [categories, setCategories] = useState<string[]>(sample.getCategories());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [competitor, setCompetitor] = useState<Competitor>("all");
  const [showTopOnly, setShowTopOnly] = useState(false);

  useEffect(() => {
    Promise.all([api.getProducts(), api.getCategories()]).then(([p, c]) => {
      setAllProducts(p);
      setCategories(c);
    });
  }, []);

  const filtered = allProducts.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && p.category !== category) return false;
    if (showTopOnly && !p.isTop2500) return false;
    // When a specific competitor is selected, only show products that have a price for it
    if (competitor === "amazon" && p.amazonPrice === null) return false;
    if (competitor === "ninja" && p.ninjaPrice === null) return false;
    if (competitor === "lulu" && p.luluPrice === null) return false;
    return true;
  });

  const showAmazon = competitor === "all" || competitor === "amazon";
  const showNinja = competitor === "all" || competitor === "ninja";
  const showLulu = competitor === "all" || competitor === "lulu";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Price Comparison</h1>
      <p className="text-sm text-gray-500 mb-5">Compare Noon Minutes prices against competitors</p>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex items-center gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <select
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value as Competitor)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {(Object.keys(COMPETITOR_LABELS) as Competitor[]).map((c) => (
            <option key={c} value={c}>{COMPETITOR_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showTopOnly} onChange={(e) => setShowTopOnly(e.target.checked)} className="rounded" />
          Top 2500 only
        </label>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} products</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600 text-xs uppercase">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold text-right">
                  <span className="text-amber-600">Noon</span>
                </th>
                {showAmazon && (
                  <th className="px-4 py-3 font-semibold text-right">
                    <span className={COMPETITOR_COLORS.amazon}>Amazon</span>
                  </th>
                )}
                {showNinja && (
                  <th className="px-4 py-3 font-semibold text-right">
                    <span className={COMPETITOR_COLORS.ninja}>Ninja</span>
                  </th>
                )}
                {showLulu && (
                  <th className="px-4 py-3 font-semibold text-right">
                    <span className={COMPETITOR_COLORS.lulu}>Lulu</span>
                  </th>
                )}
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Gap</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                // Compute cheapest among visible competitors only
                const visiblePrices: number[] = [];
                if (showAmazon && p.amazonPrice != null) visiblePrices.push(p.amazonPrice);
                if (showNinja && p.ninjaPrice != null) visiblePrices.push(p.ninjaPrice);
                if (showLulu && p.luluPrice != null) visiblePrices.push(p.luluPrice);
                const cheapest = visiblePrices.length > 0 ? Math.min(...visiblePrices) : null;
                const noonIsCheapest = p.noonPrice !== null && cheapest !== null && p.noonPrice <= cheapest;
                const gap = p.noonPrice && cheapest ? ((p.noonPrice - cheapest) / p.noonPrice) * 100 : null;

                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/product/${p.id}`} className="text-blue-600 hover:underline font-medium">
                        {p.title.length > 45 ? p.title.slice(0, 45) + "..." : p.title}
                      </Link>
                      <div className="text-xs text-gray-400 font-mono">{p.sku.slice(0, 12)}...</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.category}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{formatSAR(p.noonPrice)}</td>
                    {showAmazon && (
                      <PriceCell price={p.amazonPrice} inStock={p.amazonInStock} promo={p.amazonPromo} noonPrice={p.noonPrice} />
                    )}
                    {showNinja && (
                      <PriceCell price={p.ninjaPrice} inStock={p.ninjaInStock} promo={p.ninjaPromo} noonPrice={p.noonPrice} />
                    )}
                    {showLulu && (
                      <PriceCell price={p.luluPrice} inStock={p.luluInStock} promo={p.luluPromo} noonPrice={p.noonPrice} />
                    )}
                    <td className="px-4 py-3 text-center">
                      {noonIsCheapest ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Cheapest</span>
                      ) : cheapest !== null ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Undercut</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {gap !== null ? (
                        <span className={gap > 0 ? "text-red-600" : "text-green-600"}>
                          {gap > 0 ? "+" : ""}{gap.toFixed(1)}%
                        </span>
                      ) : "\u2014"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PriceCell({ price, inStock, promo, noonPrice }: { price: number | null; inStock: boolean; promo: string | null; noonPrice: number | null }) {
  if (price === null) {
    return (
      <td className="px-4 py-3 text-right text-gray-300 text-xs">
        {inStock ? "\u2014" : "OOS"}
      </td>
    );
  }
  const isCheaper = noonPrice !== null && price < noonPrice;
  return (
    <td className="px-4 py-3 text-right">
      <span className={`font-mono ${isCheaper ? "text-red-600 font-semibold" : "text-gray-700"}`}>
        {formatSAR(price)}
      </span>
      {promo && <div className="text-xs text-purple-600">{promo}</div>}
    </td>
  );
}
