"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import * as sample from "@/lib/sample-data";
import { formatSAR } from "@/lib/utils";

const alertTypeLabels: Record<string, { label: string; color: string; bg: string }> = {
  price_drop: { label: "Price Drop", color: "text-blue-700", bg: "bg-blue-100" },
  price_increase: { label: "Price Up", color: "text-orange-700", bg: "bg-orange-100" },
  out_of_stock: { label: "Out of Stock", color: "text-red-700", bg: "bg-red-100" },
  back_in_stock: { label: "Back in Stock", color: "text-green-700", bg: "bg-green-100" },
  undercut: { label: "Undercut", color: "text-red-700", bg: "bg-red-100" },
  new_promo: { label: "New Promo", color: "text-purple-700", bg: "bg-purple-100" },
};

const competitorColors: Record<string, string> = {
  amazon: "text-orange-600",
  ninja: "text-emerald-600",
  lulu: "text-rose-600",
};

export default function AlertsPage() {
  const [allAlerts, setAllAlerts] = useState<sample.Alert[]>(sample.getAlerts());
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    api.getAlerts().then(setAllAlerts);
  }, []);

  const filtered = filter ? allAlerts.filter((a) => a.alertType === filter) : allAlerts;
  const unreadCount = allAlerts.filter((a) => !a.isRead).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">{unreadCount} unread alerts</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !filter ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({allAlerts.length})
        </button>
        {Object.entries(alertTypeLabels).map(([type, meta]) => {
          const count = allAlerts.filter((a) => a.alertType === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === type ? `${meta.bg} ${meta.color}` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map((alert) => {
          const meta = alertTypeLabels[alert.alertType] || { label: alert.alertType, color: "text-gray-700", bg: "bg-gray-100" };
          return (
            <div
              key={alert.id}
              className={`bg-white rounded-xl shadow-sm border p-4 flex items-start gap-4 ${
                !alert.isRead ? "border-l-4 border-l-amber-400" : ""
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className={`text-xs font-medium capitalize ${competitorColors[alert.competitor] || "text-gray-600"}`}>
                    {alert.competitor}
                  </span>
                  <span className="text-xs text-gray-400">{alert.alertDate}</span>
                  {!alert.isRead && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                </div>
                <p className="text-sm text-gray-800 font-medium">{alert.productTitle}</p>
                <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  {alert.previousPrice && <span>Was: {formatSAR(alert.previousPrice)}</span>}
                  {alert.currentPrice && <span>Now: {formatSAR(alert.currentPrice)}</span>}
                  {alert.noonPrice && <span>Noon: {formatSAR(alert.noonPrice)}</span>}
                  {alert.changePct !== 0 && (
                    <span className={alert.changePct < 0 ? "text-red-500" : "text-green-500"}>
                      {alert.changePct > 0 ? "+" : ""}{alert.changePct.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
