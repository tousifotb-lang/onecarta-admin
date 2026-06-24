"use client";

import React, { useState, useEffect } from "react";
import {
  Plus, X, Calendar, Edit3, Trash2, Ticket, FileText, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";

interface PromoCode {
  _id: string;
  codeName: string;
  amount: string;
  percentage: string;
  hasMaxDiscount: boolean;
  maxDiscountValue: string;
  hasMinPurchase: boolean;
  minPurchaseValue: string;
  expiryDate: string;
}

// Converts the native date-input value (YYYY-MM-DD) into dd/mm/yyyy for display on the coupon card
function formatExpiryDate(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

export default function PromoCodeManagerMatrix() {
  const [promoList, setPromoList] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Field Interactive Input Buffers
  const [codeName, setCodeName] = useState("");
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState("");
  const [hasMaxDiscount, setHasMaxDiscount] = useState(false);
  const [maxDiscountValue, setMaxDiscountValue] = useState("");
  const [hasMinPurchase, setHasMinPurchase] = useState(false);
  const [minPurchaseValue, setMinPurchaseValue] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const loadPromoCodes = async () => {
    try {
      const res = await fetch("/api/promo-codes");
      const data = await res.json();
      if (res.ok) setPromoList(data);
    } catch (err) {
      console.error("Failed to load promo codes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setActiveId(null);
    setCodeName("");
    setAmount("");
    setPercentage("");
    setHasMaxDiscount(false);
    setMaxDiscountValue("");
    setHasMinPurchase(false);
    setMinPurchaseValue("");
    setExpiryDate("");
    setModalError("");
    setShowModal(true);
  };

  const handleOpenEditModal = (item: PromoCode) => {
    setModalMode("edit");
    setActiveId(item._id);
    setCodeName(item.codeName);
    setAmount(item.amount);
    setPercentage(item.percentage);
    setHasMaxDiscount(item.hasMaxDiscount);
    setMaxDiscountValue(item.maxDiscountValue);
    setHasMinPurchase(item.hasMinPurchase);
    setMinPurchaseValue(item.minPurchaseValue);
    setExpiryDate(item.expiryDate);
    setModalError("");
    setShowModal(true);
  };

  const handleSavePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeName.trim()) return;

    setIsSubmitting(true);
    setModalError("");

    const payload = {
      codeName,
      amount,
      percentage,
      hasMaxDiscount,
      maxDiscountValue,
      hasMinPurchase,
      minPurchaseValue,
      expiryDate,
    };

    try {
      if (modalMode === "create") {
        const res = await fetch("/api/promo-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create promo code");
      } else if (activeId) {
        const res = await fetch(`/api/promo-codes/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update promo code");
      }

      await loadPromoCodes();
      setShowModal(false);
    } catch (err: any) {
      setModalError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/promo-codes/${deleteTargetId}`, { method: "DELETE" });
      if (res.ok) setPromoList((prev) => prev.filter((item) => item._id !== deleteTargetId));
    } catch (err) {
      console.error("Failed to delete promo code:", err);
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-4 sm:p-6 lg:p-8 select-none">

      {/* Dynamic Upper Header Action Row */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-5 max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Promo Codes</h1>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
        >
          <Plus size={15} /> New Promo Code
        </button>
      </div>

      {/* Main Container Render Framework Switcher Engine */}
      <div className="max-w-7xl mx-auto mt-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-3xs gap-2 text-gray-400 font-semibold text-sm">
            <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading promo codes...
          </div>
        ) : promoList.length === 0 ? (

          /* EMPTY LIST LAYOUT */
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-3xs">
            <div className="relative w-28 h-24 mb-6 flex items-center justify-center">
              <div className="absolute -rotate-6 transform translate-x-2 border border-gray-200 bg-white p-3 rounded-xl shadow-3xs w-16 h-20 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="h-1 bg-gray-200 rounded-sm w-3/4"></div>
                  <div className="h-1 bg-gray-200 rounded-sm w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-100 rounded-sm w-full"></div>
              </div>
              <div className="absolute rotate-6 transform -translate-x-2 border border-gray-200 bg-white p-3 rounded-xl shadow-2xs w-16 h-20 flex flex-col justify-items-center items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-xs font-bold">✓</div>
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-800">Your promo list is empty</h3>
            <p className="text-xs text-gray-400 max-w-xs text-center mt-1.5 leading-relaxed">Create your first promo to attract customers and boost sales</p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} /> Create Promo Code
            </button>
          </div>
        ) : (

          /* GRID COUPON CARD LIST */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {promoList.map((promo) => (
                <div key={promo._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-3xs flex flex-col min-h-64 justify-between transition-all hover:shadow-2xs">

                  {/* Top Green Elements Container */}
                  <div className="bg-[#42aa77] text-white p-4.5 space-y-4 relative flex-1 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="text-base font-bold tracking-tight">
                        {promo.percentage ? `${promo.percentage} % Off` : `${promo.amount} BDT Off`} •
                      </div>
                      <div className="flex items-center gap-1 bg-black/10 rounded-lg p-0.5">
                        <button type="button" onClick={() => handleOpenEditModal(promo)} className="p-1 text-white/90 hover:text-white hover:bg-white/10 rounded-md transition-all cursor-pointer"><Edit3 size={13} /></button>
                        <button type="button" onClick={() => handleRequestDelete(promo._id)} className="p-1 text-white/90 hover:text-red-200 hover:bg-white/10 rounded-md transition-all cursor-pointer"><Trash2 size={13} /></button>
                      </div>
                    </div>

                    <div className="space-y-2 text-[11px] font-bold text-emerald-50/90 tracking-wide">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Min Purchase</span>
                        <span className="text-xs font-semibold text-white mt-0.5">৳ {promo.minPurchaseValue || "0"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Max Discount</span>
                        <span className="text-xs font-semibold text-white mt-0.5">৳ {promo.maxDiscountValue || "—"}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 text-[10px] font-bold text-emerald-100 flex flex-col">
                      <span className="text-[9px] text-white/50 font-medium uppercase tracking-wider">Expire Date</span>
                      <span className="text-white font-mono mt-0.5">{promo.expiryDate ? formatExpiryDate(promo.expiryDate) : "No Expiry"}</span>
                    </div>

                    {/* Left and Right Visual Coupon Notches circles */}
                    <div className="absolute -left-2.5 -bottom-2.5 w-5 h-5 rounded-full bg-[#f8f9fa] border-r border-gray-200"></div>
                    <div className="absolute -right-2.5 -bottom-2.5 w-5 h-5 rounded-full bg-[#f8f9fa] border-l border-gray-200"></div>
                  </div>

                  {/* Bottom White Elements Container with stylized zigzag line */}
                  <div className="bg-white p-4.5 text-center relative pt-6 border-t border-dashed border-gray-200">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Promo Code</span>
                    <span className="text-sm font-black text-gray-900 tracking-wider block mt-1 font-mono">{promo.codeName}</span>
                  </div>

                </div>
              ))}
            </div>

            {/* Pagination Controls Row Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500 font-semibold pt-4 select-none px-1">
              <span>Showing 1-{promoList.length} of {promoList.length}</span>
              <div className="flex items-center gap-4">
                <button type="button" disabled className="flex items-center gap-0.5 text-gray-300 disabled:cursor-not-allowed"><ChevronLeft size={14} /> Previous</button>
                <span className="w-6 h-6 rounded border border-gray-200 bg-white font-bold text-gray-700 flex items-center justify-center shadow-3xs">1</span>
                <button type="button" disabled className="flex items-center gap-0.5 text-gray-300 disabled:cursor-not-allowed">Next <ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE & EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-100 shadow-2xl p-6 relative overflow-visible animate-scaleUp max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            <button type="button" onClick={() => setShowModal(false)} className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer transition-colors">
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-3">
              {modalMode === "create" ? "Create Promo Code" : "Modify Promo Code Properties"}
            </h3>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mt-4">{modalError}</div>
            )}

            <form onSubmit={handleSavePromoCode} className="space-y-5 mt-5">

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Code Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={codeName}
                  onChange={(e) => setCodeName(e.target.value)}
                  placeholder="Promo Code"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-700 outline-none focus:border-indigo-500 uppercase font-mono tracking-wider"
                />
                <p className="text-[10px] text-gray-400 font-medium mt-1.5">Enter a unique promo code. This will help you identify it later.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Discount Type (Amount/Percentage)</label>
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-center">
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={amount}
                      disabled={!!percentage}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-white disabled:bg-gray-50 text-gray-700 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="sm:col-span-1 text-center text-xs font-bold text-gray-400 uppercase select-none">Or</div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      placeholder="Percentage"
                      value={percentage}
                      disabled={!!amount}
                      onChange={(e) => setPercentage(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-white disabled:bg-gray-50 text-gray-700 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Toggle Switch Rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-700">Max Discount</span>
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[9px] font-black cursor-help" title="Apply the highest available discount on eligible purchases.">?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasMaxDiscount(!hasMaxDiscount)}
                      className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 cursor-pointer ${
                        hasMaxDiscount ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 shadow-3xs transition-all duration-200 ${
                        hasMaxDiscount ? "right-0.5" : "left-0.5"
                      }`} />
                    </button>
                  </div>
                  {hasMaxDiscount && (
                    <input
                      type="number"
                      required
                      value={maxDiscountValue}
                      onChange={(e) => setMaxDiscountValue(e.target.value)}
                      placeholder="Maximum discount value (৳)"
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-700 outline-none focus:border-indigo-500 font-mono animate-slideDown"
                    />
                  )}
                  <p className="text-[10px] text-gray-400 leading-relaxed font-medium">Apply the highest available discount on eligible purchases.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-700">Min Purchase</span>
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[9px] font-black cursor-help" title="Set a minimum purchase requirement for discounts to apply.">?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasMinPurchase(!hasMinPurchase)}
                      className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 cursor-pointer ${
                        hasMinPurchase ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 shadow-3xs transition-all duration-200 ${
                        hasMinPurchase ? "right-0.5" : "left-0.5"
                      }`} />
                    </button>
                  </div>
                  {hasMinPurchase && (
                    <input
                      type="number"
                      required
                      value={minPurchaseValue}
                      onChange={(e) => setMinPurchaseValue(e.target.value)}
                      placeholder="Minimum purchase required (৳)"
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-700 outline-none focus:border-indigo-500 font-mono animate-slideDown"
                    />
                  )}
                  <p className="text-[10px] text-gray-400 leading-relaxed font-medium">Set a minimum purchase requirement for discounts to apply.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Expiry Date</label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-700 outline-none focus:border-indigo-500 font-mono [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-1.5">Click the calendar icon to pick a date, or leave empty for no expiry.</p>
              </div>

              {/* Action Trigger Buttons Row */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {isSubmitting ? "Saving..." : modalMode === "create" ? "Create" : "Save Changes"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => !isDeleting && setDeleteTargetId(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-100 shadow-2xl p-6 relative animate-scaleUp" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center">Delete this promo code?</h3>
            <p className="text-xs text-gray-400 text-center mt-2 leading-relaxed">
              This action cannot be undone. The promo code will be permanently removed.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                disabled={isDeleting}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs py-2.5 rounded-xl cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 size={14} className="animate-spin" />}
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}