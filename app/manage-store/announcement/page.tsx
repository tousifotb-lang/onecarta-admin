// Place this file at: app/manage-store/announcement/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Megaphone, Loader2, Check, Plus, Trash2 } from "lucide-react";

export default function AnnouncementSettingsPage() {
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedJustNow, setSavedJustNow] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/announcement");
        const data = await res.json();
        if (res.ok) {
          setIsActive(data.isActive ?? false);
          setMessages(Array.isArray(data.messages) && data.messages.length > 0 ? data.messages : [""]);
        }
      } catch (err) {
        console.error("Failed to load announcement settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleMessageChange = (index: number, value: string) => {
    setMessages((prev) => prev.map((m, i) => (i === index ? value : m)));
  };

  const handleAddMessage = () => {
    setMessages((prev) => [...prev, ""]);
  };

  const handleRemoveMessage = (index: number) => {
    setMessages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""]; // always keep at least one input row
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError("");
    setSavedJustNow(false);
    try {
      const res = await fetch("/api/settings/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive, messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      // Server strips blanks — reflect that back so the UI matches what's actually saved
      setMessages(Array.isArray(data.messages) && data.messages.length > 0 ? data.messages : [""]);
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
        <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading announcement settings...
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
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Megaphone size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Announcement Bar</h1>
            <p className="text-sm text-gray-400 font-medium mt-0.5">Control the scrolling coupon/offer strip above the navbar. Add multiple messages — they'll cycle one at a time.</p>
          </div>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mb-5">{saveError}</div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-3xs p-6 space-y-6">

          {/* Enable toggle */}
          <div className="flex items-center justify-between pb-5 border-b border-gray-50">
            <div>
              <p className="text-sm font-bold text-gray-800">Show Announcement Bar</p>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Turn off (or leave all messages empty) to hide the strip completely — the phone number / order status row will show instead, exactly as it does today.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-11 h-6 rounded-full relative transition-colors duration-200 cursor-pointer shrink-0 ${
                isActive ? "bg-indigo-600" : "bg-slate-300"
              }`}
            >
              <span className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-3xs transition-all duration-200 ${
                isActive ? "right-0.5" : "left-0.5"
              }`} />
            </button>
          </div>

          {/* Messages list */}
          <div className={isActive ? "space-y-3" : "space-y-3 opacity-40 pointer-events-none"}>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Announcement Messages</label>

            {messages.map((msg, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={msg}
                  onChange={(e) => handleMessageChange(index, e.target.value)}
                  placeholder="e.g. 🎉 Use code SUMMER20 for 20% off — Free delivery on orders above ৳999!"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-white text-gray-700 outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveMessage(index)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddMessage}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 px-1 py-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add another message
            </button>

            <p className="text-[11px] text-gray-400 font-medium leading-relaxed pt-1">
              Each message scrolls fully across, disappears, then the next one starts. With one message, it just repeats on a loop.
            </p>
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