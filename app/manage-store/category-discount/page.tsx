// Place this file at: app/manage-store/category-discount/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft, BadgePercent, Loader2, Check, AlertTriangle, Trash2, Eye
} from "lucide-react";

interface Category {
  _id: string;
  name: string;
  parentId?: string | null;
}

interface CategoryOption {
  _id: string;
  label: string;
}

interface ActiveDiscount {
  _id: string;
  categoryId: string;
  categoryName: string;
  includeSubcategories: boolean;
  discountType: "percentage" | "flat";
  discountValue: number;
  productCount: number;
  appliedAt: string;
}

export default function CategoryBulkDiscountPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeDiscounts, setActiveDiscounts] = useState<ActiveDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [categoryId, setCategoryId] = useState("");
  const [includeSubcategories, setIncludeSubcategories] = useState(true);
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [discountValue, setDiscountValue] = useState("");

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [removeTarget, setRemoveTarget] = useState<ActiveDiscount | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const loadData = async () => {
    try {
      const [catRes, discRes] = await Promise.all([
        fetch("/api/categories?all=true"),
        fetch("/api/products/bulk-discount"),
      ]);
      const catData = await catRes.json();
      const discData = await discRes.json();
      if (catRes.ok) setCategories(catData);
      if (discRes.ok) setActiveDiscounts(discData);
    } catch (err) {
      console.error("Failed to load category discount data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Same indented-tree builder used in the Product form's category dropdown
  const categoryOptions: CategoryOption[] = useMemo(() => {
    const byParent: Record<string, Category[]> = {};
    categories.forEach((cat) => {
      const key = cat.parentId ? String(cat.parentId) : "root";
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(cat);
    });

    const result: CategoryOption[] = [];
    const seen = new Set<string>();

    const walk = (parentKey: string, depth: number) => {
      const children = byParent[parentKey] || [];
      children.forEach((cat) => {
        if (seen.has(cat._id)) return;
        seen.add(cat._id);
        const prefix = depth > 0 ? "— ".repeat(depth) : "";
        result.push({ _id: cat._id, label: `${prefix}${cat.name}` });
        walk(cat._id, depth + 1);
      });
    };

    walk("root", 0);
    categories.forEach((cat) => {
      if (!seen.has(cat._id)) {
        seen.add(cat._id);
        result.push({ _id: cat._id, label: cat.name });
      }
    });

    return result;
  }, [categories]);

  const resetPreview = () => {
    setPreviewCount(null);
    setFormError("");
    setSuccessMsg("");
  };

  const handlePreview = async () => {
    if (!categoryId) {
      setFormError("Please select a category first.");
      return;
    }
    setIsPreviewing(true);
    setFormError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/products/bulk-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", categoryId, includeSubcategories }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to preview");
      setPreviewCount(data.productCount);
    } catch (err: any) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!categoryId) {
      setFormError("Please select a category first.");
      return;
    }
    const value = Number(discountValue);
    if (!value || value <= 0) {
      setFormError("Please enter a valid discount value.");
      return;
    }
    if (discountType === "percentage" && value >= 100) {
      setFormError("Percentage discount must be less than 100%.");
      return;
    }

    setIsApplying(true);
    setFormError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/products/bulk-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          categoryId,
          includeSubcategories,
          discountType,
          discountValue: value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply discount");
      setSuccessMsg(`Discount applied to ${data.modifiedCount} product(s).`);
      setDiscountValue("");
      setPreviewCount(null);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setIsApplying(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      const res = await fetch("/api/products/bulk-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          categoryId: removeTarget.categoryId,
          includeSubcategories: removeTarget.includeSubcategories,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove discount");
      }
      await loadData();
    } catch (err) {
      console.error("Failed to remove category discount:", err);
    } finally {
      setIsRemoving(false);
      setRemoveTarget(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return iso;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center gap-2 text-gray-400 font-semibold text-sm">
        <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading category discount data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-6 sm:p-8 select-none">
      <div className="max-w-3xl mx-auto">
        <Link href="/manage-store" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors mb-6">
          <ChevronLeft size={14} /> Back to Manage Store
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><BadgePercent size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Category-Wide Bulk Discount</h1>
            <p className="text-sm text-gray-400 font-medium mt-0.5">
              Apply a discount to every product in a category at once — great for campaign sales. Prices update directly, so they show everywhere on the storefront instantly.
            </p>
          </div>
        </div>

        {/* Apply Discount Form */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-3xs p-6 space-y-5 mb-8">
          <h2 className="text-sm font-bold text-gray-800">Apply New Discount</h2>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl">{formError}</div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-1.5">
              <Check size={14} /> {successMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); resetPreview(); }}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-white text-gray-700 outline-none focus:border-indigo-500"
            >
              <option value="">Select a category</option>
              {categoryOptions.map((opt) => (
                <option key={opt._id} value={opt._id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-xl p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSubcategories}
              onChange={(e) => { setIncludeSubcategories(e.target.checked); resetPreview(); }}
              className="mt-0.5 accent-indigo-600 cursor-pointer"
            />
            <span className="text-xs text-gray-600 font-semibold leading-relaxed">
              Include subcategories — also apply the discount to every product under this category's subcategories (recommended for parent categories).
            </span>
          </label>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Discount Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setDiscountType("percentage"); resetPreview(); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  discountType === "percentage" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => { setDiscountType("flat"); resetPreview(); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  discountType === "flat" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                Flat Amount (৳)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              {discountType === "percentage" ? "Discount Percentage" : "Discount Amount (৳)"}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percentage" ? "e.g. 20" : "e.g. 100"}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold bg-white text-gray-700 outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-gray-400 font-medium mt-1.5">
              Always calculated from each product's original price — safe to re-apply with a new value anytime, it won't stack on top of a previous discount.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <button
              type="button"
              onClick={handlePreview}
              disabled={isPreviewing || !categoryId}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isPreviewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              {isPreviewing ? "Checking..." : "Preview Affected Products"}
            </button>

            {previewCount !== null && (
              <span className="text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                {previewCount} product{previewCount === 1 ? "" : "s"} will be affected
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isApplying && <Loader2 size={16} className="animate-spin" />}
            {isApplying ? "Applying..." : "Apply Discount"}
          </button>
        </div>

        {/* Active Discounts List */}
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Active Category Discounts</h2>

          {activeDiscounts.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
              <p className="text-sm font-semibold text-gray-500">No category discounts active right now</p>
              <p className="text-xs text-gray-400 mt-1">Apply one above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDiscounts.map((disc) => (
                <div key={disc._id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-3xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900">{disc.categoryName}</span>
                      {disc.includeSubcategories && (
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          + Subcategories
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-semibold mt-1">
                      {disc.discountType === "percentage" ? `${disc.discountValue}% off` : `৳${disc.discountValue} off`} · {disc.productCount} product{disc.productCount === 1 ? "" : "s"} · Applied {formatDate(disc.appliedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(disc)}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Remove Confirmation Modal */}
      {removeTarget && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => !isRemoving && setRemoveTarget(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-100 shadow-2xl p-6 relative animate-scaleUp" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center">
              Remove discount from "{removeTarget.categoryName}"?
            </h3>
            <p className="text-xs text-gray-400 text-center mt-2 leading-relaxed">
              All {removeTarget.productCount} affected product(s) will have their price restored to the original price.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={isRemoving}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs py-2.5 rounded-xl cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isRemoving && <Loader2 size={14} className="animate-spin" />}
                {isRemoving ? "Removing..." : "Remove Discount"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}