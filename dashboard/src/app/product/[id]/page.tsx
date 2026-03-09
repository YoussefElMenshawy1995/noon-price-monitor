"use client";

import { use } from "react";
import { getProduct, getPriceHistory } from "@/lib/sample-data";
import { formatSAR } from "@/lib/utils";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import Link from "next/link";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = getProduct(parseInt(id));
  const history = getPriceHistory(parseInt(id));

  if (!product) {
    return <div className="text-center py-20 text-gray-500">Product not found</div>;
  }

  const compPrices = [
    { name: "Amazon", price: product.amazonPrice, inStock: product.amazonInStock, delivery: product.amazonDelivery, promo: product.amazonPromo },
    { name: "Ninja", price: product.ninjaPrice, inStock: product.ninjaInStock, delivery: product.ninjaDelivery, promo: product.ninjaPromo },
    { name: "Lulu", price: product.luluPrice, inStock: product.luluInStock, delivery: product.luluDelivery, promo: product.luluPromo },
  ];

  return (
    <div>
      <Link href="/compare" className="text-sm text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Compare</Link>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{product.title}</h1>
            <div className="flex gap-3 mt-2 text-sm text-gray-500">
              <span className="font-mono">{product.sku}</span>
              <span>|</span>
              <span>{product.category}</span>
              <span>|</span>
              <span>{product.brand}</span>
              {product.isTop2500 && (
                <>
                  <span>|</span>
                  <span className="text-amber-600 font-medium">Top 2500</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Noon Price</p>
            <p className="text-2xl font-bold text-amber-600">{formatSAR(product.noonPrice)}</p>
          </div>
        </div>
      </div>

      {/* Price Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {compPrices.map((c) => {
          const isCheaper = c.price !== null && product.noonPrice !== null && c.price < product.noonPrice;
          return (
            <div key={c.name} className={`bg-white rounded-xl shadow-sm border p-5 ${isCheaper ? "ring-2 ring-red-200" : ""}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-700">{c.name}</h3>
                {c.inStock ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">In Stock</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Out of Stock</span>
                )}
              </div>
              <p className={`text-2xl font-bold ${isCheaper ? "text-red-600" : "text-gray-900"}`}>
                {formatSAR(c.price)}
              </p>
              {c.price && product.noonPrice && (
                <p className={`text-sm mt-1 ${isCheaper ? "text-red-500" : "text-green-600"}`}>
                  {isCheaper ? "" : "+"}{((product.noonPrice - c.price) / product.noonPrice * 100).toFixed(1)}% vs Noon
                </p>
              )}
              {c.delivery && <p className="text-xs text-gray-400 mt-2">Delivery: {c.delivery}</p>}
              {c.promo && <p className="text-xs text-purple-600 mt-1">Promo: {c.promo}</p>}
            </div>
          );
        })}
      </div>

      {/* Price History Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Price History (30 Days)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}`} domain={["auto", "auto"]} />
            <Tooltip formatter={(v: number) => `SAR ${v.toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="noon" stroke="#F59E0B" strokeWidth={2} dot={false} name="Noon" />
            <Line type="monotone" dataKey="amazon" stroke="#FF9900" strokeWidth={2} dot={false} name="Amazon" />
            <Line type="monotone" dataKey="ninja" stroke="#10B981" strokeWidth={2} dot={false} name="Ninja" />
            <Line type="monotone" dataKey="lulu" stroke="#E11D48" strokeWidth={2} dot={false} name="Lulu" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
