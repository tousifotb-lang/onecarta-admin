// Place this file at: app/manage-store/delivery/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Truck, Loader2, Check } from "lucide-react";

export default function DeliverySettingsPage() {
  const [insideDhaka, setInsideDhaka] = useState("80");
  const [specialZone, setSpecialZone] = useState("100");
  const [outsideDhaka, setOutsideDhaka] = useState("120");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedJustNow, setSavedJustNow] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/delivery");
        const data = await res.json();
        if (res.ok && data.rates) {
          setInsideDhaka(String(data.rates.insideDhaka));
          setSpecialZone(String(data.rates.specialZone));
          setOutsideDhaka(String(data.rates.outsideDhaka));
        }
      } catch (err) {
        console.error("Failed to load delivery settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError("");
    setSavedJustNow(false);
    try {
      const res = await fetch("/api/settings/delivery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insideDhaka: Number(insideDhaka),
          specialZone: Number(specialZone),
          outsideDhaka: Number(outsideDhaka),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 2500);
    } catch (err: any) {
      setSaveError(err.message || "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center gap-2 text-gray-400 font-semibold text-sm">
        <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading delivery settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-6 sm:p-8 select-none">
      <div className="max-w-2xl mx-auto">
        <Link href="/manage-store" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors mb-6">
          <ChevronLeft size={14} /> Back to Manage Store
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Truck size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Delivery Charges</h1>
            <p className="text-sm text-gray-400 font-medium mt-0.5">
              Control the standard delivery rates used at checkout — change these anytime for a campaign (e.g. flat ৳10 delivery) and change back later.
            </p>
          </div>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mb-5">{saveError}</div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-3xs p-6 space-y-5">

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Inside Dhaka (Standard)</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-gray-400">৳</span>
              <input
                type="number"
                min={0}
                value={insideDhaka}
                onChange={(e) => setInsideDhaka(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold bg-white text-gray-700 outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1.5">Applies to most Dhaka thanas at checkout.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Inside Dhaka — Savar / Keranigonj</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-gray-400">৳</span>
              <input
                type="number"
                min={0}
                value={specialZone}
                onChange={(e) => setSpecialZone(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold bg-white text-gray-700 outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1.5">These two thanas are further out, so they get their own rate.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Outside Dhaka</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-gray-400">৳</span>
              <input
                type="number"
                min={0}
                value={outsideDhaka}
                onChange={(e) => setOutsideDhaka(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold bg-white text-gray-700 outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1.5">Applies to every district outside Dhaka.</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-50">
            {savedJustNow && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <Check size={14} /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}