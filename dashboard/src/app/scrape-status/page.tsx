"use client";

import { getScrapeRuns } from "@/lib/sample-data";
import { formatDuration } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const competitorColors: Record<string, string> = {
  amazon: "#FF9900",
  ninja: "#10B981",
  lulu: "#E11D48",
};

export default function ScrapeStatusPage() {
  const runs = getScrapeRuns();

  // Group by date for chart
  const dateMap = new Map<string, { date: string; amazon: number; ninja: number; lulu: number }>();
  for (const run of runs) {
    if (!dateMap.has(run.runDate)) {
      dateMap.set(run.runDate, { date: run.runDate, amazon: 0, ninja: 0, lulu: 0 });
    }
    const entry = dateMap.get(run.runDate)!;
    const rate = run.totalUrls > 0 ? Math.round((run.successCount / run.totalUrls) * 100) : 0;
    if (run.competitor === "amazon") entry.amazon = rate;
    if (run.competitor === "ninja") entry.ninja = rate;
    if (run.competitor === "lulu") entry.lulu = rate;
  }
  const chartData = Array.from(dateMap.values()).reverse();

  // Today's summary
  const todayRuns = runs.filter((r) => r.runDate === runs[0]?.runDate);
  const totalSuccess = todayRuns.reduce((s, r) => s + r.successCount, 0);
  const totalUrls = todayRuns.reduce((s, r) => s + r.totalUrls, 0);
  const totalBlocked = todayRuns.reduce((s, r) => s + r.blockedCount, 0);
  const totalFailed = todayRuns.reduce((s, r) => s + r.failedCount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Scrape Status</h1>
      <p className="text-sm text-gray-500 mb-6">Health and performance of daily scraping jobs</p>

      {/* Today's Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">Total URLs</p>
          <p className="text-2xl font-bold text-gray-900">{totalUrls.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">Successful</p>
          <p className="text-2xl font-bold text-green-600">{totalSuccess.toLocaleString()}</p>
          <p className="text-xs text-gray-400">{totalUrls > 0 ? Math.round((totalSuccess / totalUrls) * 100) : 0}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">{totalFailed.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">Blocked (CAPTCHA)</p>
          <p className="text-2xl font-bold text-orange-600">{totalBlocked.toLocaleString()}</p>
        </div>
      </div>

      {/* Success Rate Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Success Rate by Competitor (7 Days)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Legend />
            <Bar dataKey="amazon" fill="#FF9900" name="Amazon" radius={[2, 2, 0, 0]} />
            <Bar dataKey="ninja" fill="#10B981" name="Ninja" radius={[2, 2, 0, 0]} />
            <Bar dataKey="lulu" fill="#E11D48" name="Lulu" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Run Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Competitor</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">URLs</th>
              <th className="px-4 py-3 font-semibold text-right">Success</th>
              <th className="px-4 py-3 font-semibold text-right">Failed</th>
              <th className="px-4 py-3 font-semibold text-right">Blocked</th>
              <th className="px-4 py-3 font-semibold text-right">Rate</th>
              <th className="px-4 py-3 font-semibold text-right">Duration</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const rate = run.totalUrls > 0 ? Math.round((run.successCount / run.totalUrls) * 100) : 0;
              return (
                <tr key={run.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-600">{run.runDate}</td>
                  <td className="px-4 py-2">
                    <span className="capitalize font-medium" style={{ color: competitorColors[run.competitor] }}>
                      {run.competitor}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      run.status === "completed" ? "bg-green-100 text-green-700" :
                      run.status === "partial" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{run.totalUrls.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono text-green-600">{run.successCount.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono text-red-600">{run.failedCount}</td>
                  <td className="px-4 py-2 text-right font-mono text-orange-600">{run.blockedCount}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium">
                    <span className={rate >= 90 ? "text-green-600" : rate >= 70 ? "text-yellow-600" : "text-red-600"}>
                      {rate}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">{formatDuration(run.durationSecs)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
