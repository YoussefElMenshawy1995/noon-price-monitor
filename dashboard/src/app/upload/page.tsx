"use client";

import { useState } from "react";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const rows = lines.map((line) => line.split(",").map((c) => c.trim()));
      setPreview(rows.slice(0, 11)); // header + 10 rows
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Upload Noon Prices</h1>
      <p className="text-sm text-gray-500 mb-6">Upload a CSV file with Noon Minutes pricing data</p>

      {/* Expected format */}
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">Expected CSV Format</h3>
        <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600 overflow-x-auto">
          <p>sku,price,original_price,in_stock,promo_label</p>
          <p>ZD8D524CF775916C8447DZ-1,54.90,59.90,true,Flash Sale</p>
          <p>ZA1B2C3D4E5F6G7H8I9JZ-1,89.00,,true,</p>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Fields: <strong>sku</strong> (required), <strong>price</strong> (SAR), <strong>original_price</strong> (before discount), <strong>in_stock</strong> (true/false), <strong>promo_label</strong> (optional)
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`bg-white rounded-xl shadow-sm border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          isDragging ? "border-amber-400 bg-amber-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <div className="text-4xl mb-3">📄</div>
        <p className="text-gray-600 font-medium">Drag & drop your CSV file here</p>
        <p className="text-sm text-gray-400 mt-1">or click to browse</p>
        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="csv-upload"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <label htmlFor="csv-upload" className="mt-4 inline-block px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-amber-600">
          Browse Files
        </label>
      </div>

      {/* Preview Table */}
      {preview && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">Preview: {fileName}</h3>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              Upload {preview.length - 1} rows
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {preview[0]?.map((header, i) => (
                    <th key={i} className="px-4 py-2 text-left text-xs text-gray-500 uppercase font-semibold">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-t border-gray-100">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2 text-gray-700 font-mono text-xs">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload History */}
      <div className="mt-8">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">Recent Uploads</h3>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold">File</th>
                <th className="px-4 py-2 font-semibold">Rows</th>
                <th className="px-4 py-2 font-semibold">Matched</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: "2026-03-09", file: "noon_prices_mar9.csv", rows: 11842, matched: 11650, status: "success" },
                { date: "2026-03-08", file: "noon_prices_mar8.csv", rows: 11842, matched: 11648, status: "success" },
                { date: "2026-03-07", file: "noon_prices_mar7.csv", rows: 11800, matched: 11590, status: "success" },
              ].map((u, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-600">{u.date}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{u.file}</td>
                  <td className="px-4 py-2 text-gray-600">{u.rows.toLocaleString()}</td>
                  <td className="px-4 py-2 text-gray-600">{u.matched.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Success</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
