"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import * as sample from "@/lib/sample-data";
import { formatSAR } from "@/lib/utils";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from "recharts";
import Link from "next/link";

export default function OverviewPage() {
  const [stats, setStats] = useState(sample.getStats());
  const [trend, setTrend] = useState(sample.getPositionTrend());
  const [categories, setCategories] = useState(sample.getCategoryBreakdown());
  const [products, setProducts] = useState<sample.Product[]>(sample.getProducts());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getPositionTrend(),
      api.getCategoryBreakdown(),
      api.getProducts(),
    ]).then(([s, t, c, p]) => {
      setStats(s);
      setTrend(t);
      setCategories(c);
      setProducts(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const pieData = [
    { name: "Noon Cheapest", value: stats.noonCheapestPct, color: "#10B981" },
    { name: "Competitor Cheaper", value: stats.noonUndercutPct, color: "#EF4444" },
    { name: "Same Price", value: Math.max(0, 100 - stats.noonCheapestPct - stats.noonUndercutPct), color: "#6B7280" },
  ];

  const undercuts = products
    .filter((p) => {
      if (!p.noonPrice) return false;
      const comp = [p.amazonPrice, p.ninjaPrice, p.luluPrice].filter(Boolean) as number[];
      return comp.length > 0 && Math.min(...comp) < p.noonPrice;
    })
    .map((p) => {
      const comp = [
        { name: "Amazon", price: p.amazonPrice },
        { name: "Ninja", price: p.ninjaPrice },
        { name: "Lulu", price: p.luluPrice },
      ].filter((c) => c.price !== null) as { name: string; price: number }[];
      const cheapest = comp.reduce((a, b) => (a.price < b.price ? a : b));
      const gap = p.noonPrice! - cheapest.price;
      const gapPct = (gap / p.noonPrice!) * 100;
      return { ...p, cheapestComp: cheapest.name, cheapestPrice: cheapest.price, gap, gapPct };
    })
    .sort((a, b) => b.gapPct - a.gapPct);

  const lastUpdated = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Riyadh",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdated} AST</p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${loading ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
          {loading ? "Loading..." : "Live"}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total SKUs" value={stats.totalProducts.toLocaleString()} sub={`${stats.totalProducts.toLocaleString()} unique products`} />
        <KpiCard label="Scrape Success Rate" value={`${stats.scrapeSuccessRate}%`} sub={`${stats.trackedProducts.toLocaleString()} URLs scraped`} color="text-green-600" />
        <KpiCard label="Noon is Cheapest" value={`${stats.noonCheapestPct}%`} sub="of tracked products" color="text-amber-600" />
        <KpiCard label="Undercut by Competitors" value={`${stats.noonUndercutPct}%`} sub={`Avg gap: ${stats.avgGapPct}%`} color="text-red-600" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Price Position Today</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ value }) => `${value}%`}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5 col-span-2">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Noon Cheapest % (30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="noonCheapestPct" stroke="#F59E0B" strokeWidth={2} dot={false} name="Noon Cheapest %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Undercut % by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="undercutPct" fill="#EF4444" radius={[0, 4, 4, 0]} name="Undercut %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Top Undercuts</h3>
          <div className="overflow-auto max-h-[320px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium text-right">Noon</th>
                  <th className="pb-2 font-medium text-right">Best Comp</th>
                  <th className="pb-2 font-medium text-right">Gap</th>
                </tr>
              </thead>
              <tbody>
                {undercuts.slice(0, 10).map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2">
                      <Link href={`/product/${p.id}`} className="text-blue-600 hover:underline text-xs">
                        {p.title.length > 35 ? p.title.slice(0, 35) + "..." : p.title}
                      </Link>
                      <div className="text-xs text-gray-400">{p.cheapestComp}</div>
                    </td>
                    <td className="py-2 text-right font-mono text-xs">{formatSAR(p.noonPrice)}</td>
                    <td className="py-2 text-right font-mono text-xs text-red-600">{formatSAR(p.cheapestPrice)}</td>
                    <td className="py-2 text-right">
                      <span className="text-red-600 font-medium text-xs">-{p.gapPct.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color = "text-gray-900" }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
