"use client";

import { useState, useEffect } from "react";
import { Gift, Loader2, Save } from "lucide-react";

interface LoyaltySettingsData {
  isActive: boolean;
  earnRateAmount: number;
  earnRatePoints: number;
  redeemPointsAmount: number;
  redeemValueAmount: number;
  minRedeemPoints: number;
}

export default function LoyaltyPointsPage() {
  const [settings, setSettings] = useState<LoyaltySettingsData>({
    isActive: true,
    earnRateAmount: 100,
    earnRatePoints: 1,
    redeemPointsAmount: 100,
    redeemValueAmount: 10,
    minRedeemPoints: 100,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    fetch("/api/loyalty-settings")
      .then((r) => r.json())
      .then((d) => setSettings(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch("/api/loyalty-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
        setSavedMsg("Settings saved successfully!");
        setTimeout(() => setSavedMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center gap-2 font-bold text-gray-500 text-xs tracking-wider uppercase">
        <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading loyalty settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 p-4 sm:p-6 lg:p-8 space-y-6 antialiased">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Gift size={22} className="text-indigo-600" /> Loyalty Points
        </h1>
        <p className="text-xs font-semibold text-gray-400 mt-0.5">
          Configure how customers earn and redeem reward points
        </p>
      </div>

      {savedMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold p-3 rounded-xl text-center">
          {savedMsg}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Loyalty Points Program</h2>
          <p className="text-xs font-medium text-gray-400 mt-1">
            When off, customers can't earn or redeem points anywhere on the storefront.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettings((p) => ({ ...p, isActive: !p.isActive }))}
          className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${settings.isActive ? "bg-indigo-600" : "bg-gray-300"}`}
        >
          <span className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all duration-200 ${settings.isActive ? "right-0.5" : "left-0.5"}`} />
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Earn Rate</h2>
        <p className="text-xs font-medium text-gray-400 -mt-2">
          Points are credited once an order is marked <span className="font-bold text-gray-600">Delivered</span>.
        </p>
        <div className="flex items-center gap-3 flex-wrap text-sm font-bold text-gray-700">
          <span>Spend</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">৳</span>
            <input
              type="number"
              min={0}
              value={settings.earnRateAmount}
              onChange={(e) => setSettings((p) => ({ ...p, earnRateAmount: Number(e.target.value) || 0 }))}
              className="w-28 pl-6 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
            />
          </div>
          <span>to earn</span>
          <input
            type="number"
            min={0}
            value={settings.earnRatePoints}
            onChange={(e) => setSettings((p) => ({ ...p, earnRatePoints: Number(e.target.value) || 0 }))}
            className="w-24 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
          />
          <span>point(s)</span>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Redemption Rate</h2>
        <p className="text-xs font-medium text-gray-400 -mt-2">
          How many points a customer needs to redeem for a discount at checkout.
        </p>
        <div className="flex items-center gap-3 flex-wrap text-sm font-bold text-gray-700">
          <input
            type="number"
            min={0}
            value={settings.redeemPointsAmount}
            onChange={(e) => setSettings((p) => ({ ...p, redeemPointsAmount: Number(e.target.value) || 0 }))}
            className="w-24 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
          />
          <span>points =</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">৳</span>
            <input
              type="number"
              min={0}
              value={settings.redeemValueAmount}
              onChange={(e) => setSettings((p) => ({ ...p, redeemValueAmount: Number(e.target.value) || 0 }))}
              className="w-28 pl-6 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
            />
          </div>
          <span>discount</span>
        </div>

        <div className="pt-3 border-t border-gray-50">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-2">
            Minimum points required to redeem
          </label>
          <input
            type="number"
            min={0}
            value={settings.minRedeemPoints}
            onChange={(e) => setSettings((p) => ({ ...p, minRedeemPoints: Number(e.target.value) || 0 }))}
            className="w-40 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-sm transition-all cursor-pointer flex items-center gap-2"
      >
        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {isSaving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}