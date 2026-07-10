"use client";

import { useState, useEffect } from "react";
import { Search, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";

interface SearchLogEntry {
  term: string;
  count: number;
  resultsFoundCount?: number;
  lastSearchedAt: string;
}

export default function AnalyticsPage() {
  const [topSearches, setTopSearches] = useState<SearchLogEntry[]>([]);
  const [zeroResultSearches, setZeroResultSearches] = useState<SearchLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/search-analytics")
      .then((r) => r.json())
      .then((d) => {
        setTopSearches(d.topSearches || []);
        setZeroResultSearches(d.zeroResultSearches || []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center gap-2 font-bold text-gray-500 text-xs tracking-wider uppercase">
        <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading search analytics...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 p-4 sm:p-6 lg:p-8 space-y-6 antialiased">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Search Analytics</h1>
        <p className="text-xs font-semibold text-gray-400 mt-0.5">
          See what customers are searching for on the storefront
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Searches */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-600" /> Top Searches
          </h2>
          {topSearches.length === 0 ? (
            <p className="text-xs font-bold text-gray-400 text-center py-8">No searches recorded yet</p>
          ) : (
            <div className="space-y-2">
              {topSearches.map((entry, i) => (
                <div
                  key={entry.term}
                  className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black text-[10px] shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-800 capitalize">{entry.term}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900 bg-gray-50 px-2.5 py-0.5 rounded-full">
                    {entry.count} search{entry.count === 1 ? "" : "es"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zero Result Searches */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Searched but Not Found
          </h2>
          <p className="text-[11px] font-medium text-gray-400 -mt-2">
            Customers searched for these but got zero results — consider adding matching products.
          </p>
          {zeroResultSearches.length === 0 ? (
            <p className="text-xs font-bold text-gray-400 text-center py-8">
              No zero-result searches — great coverage!
            </p>
          ) : (
            <div className="space-y-2">
              {zeroResultSearches.map((entry) => (
                <div
                  key={entry.term}
                  className="flex items-center justify-between border border-amber-100 bg-amber-50/40 rounded-xl px-4 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Search size={13} className="text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-gray-800 capitalize">{entry.term}</span>
                  </div>
                  <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    {entry.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}