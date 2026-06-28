"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  ArrowRight, Copy, Globe, Banknote, ShoppingCart, 
  Package, Users, Eye, TrendingUp, AlertCircle, 
  Plus, BarChart3, Folder, Palette, Settings, Loader2,
  TriangleAlert, Rocket, Zap, Clock3, CheckCircle2,
  Truck, XCircle, Calendar, Download, ChevronDown, Bell, CheckSquare, Square
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

interface Order {
  _id: string;
  orderId: string;
  customerName: string;
  paymentMethod: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  itemsCount: number;
}

interface LowStock {
  title: string;
  stock: number;
}

interface OutOfStockItem {
  title: string;
  stock: number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
}

interface TopSelling {
  title: string;
  sold: number;
}

interface RevenuePoint {
  date: string;
  label: string;
  revenue: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface AnalyticsData {
  totalRevenue: number;
  totalOrdersCount: number;
  totalProducts: number;
  totalCategories: number;
  totalCustomers: number;
  customerList: CustomerInfo[];
  totalStockValue: number;
  outOfStockCount: number;
  outOfStockItems: OutOfStockItem[];
  lowStockItems: LowStock[];
  topSellingItems: TopSelling[];
  recentOrders: Order[];
  ordersByStatus: StatusCount[];
  revenueOverview: RevenuePoint[];
}

const STATUS_COLORS: Record<string, string> = {
  Placed: "#9333ea",
  "On Hold": "#d97706",
  Confirmed: "#2563eb",
  Shipped: "#0891b2",
  Delivered: "#65a30d",
  Completed: "#059669",
  Cancelled: "#db2777",
  Returned: "#ea580c",
  "Payment OnProcess": "#4f46e5",
  "Payment Failed": "#dc2626",
};
const DEFAULT_STATUS_COLOR = "#94a3b8";

function getRelativeTime(dateString: string): string {
  const then = new Date(dateString).getTime();
  const now = Date.now();
  const diffMs = now - then;

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(dateString).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export default function RealTimeDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeDetailModal, setActiveDetailModal] = useState<"revenue" | "orders" | "products" | "customers" | "outOfStock" | null>(null);

  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeRangeLabel, setActiveRangeLabel] = useState("Last 30 days");
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [greeting, setGreeting] = useState({ text: "Good morning", emoji: "☀️" });

  // DYNAMIC PLACED POPUP STATES
  const [placedOrders, setPlacedOrders] = useState<Order[]>([]);
  const [showNewOrderPopup, setShowNewOrderPopup] = useState(false);
  
  // REAL-TIME MULTIPLE SELECTOR STATE
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // "ARE YOU SURE?" CONFIRMATION DIALOG STATE
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  async function getLiveDashboardData(startDate?: string, endDate?: string) {
    try {
      const query = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : "";
      const res = await fetch(`/api/analytics${query}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        
        if (json.recentOrders) {
          const matchingOrders = json.recentOrders.filter(
            (order: Order) => order.status.toLowerCase() === "placed"
          );
          setPlacedOrders(matchingOrders);
          
          // Fixed implicit 'any' by explicitly mapping with defined 'Order' interface type
          setSelectedOrderIds(matchingOrders.map((o: Order) => o._id));
          
          if (matchingOrders.length > 0 && !sessionStorage.getItem("popupClosedManually")) {
            setShowNewOrderPopup(true);
          }
        }
      }
    } catch (err) {
      console.error("Live sync failed", err);
    } finally {
      setIsLoading(false);
      setIsRangeLoading(false);
    }
  }

  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) setGreeting({ text: "Good morning", emoji: "☀️" });
    else if (currentHour >= 12 && currentHour < 16) setGreeting({ text: "Good afternoon", emoji: "🌤️" });
    else if (currentHour >= 16 && currentHour < 19) setGreeting({ text: "Good evening", emoji: "🌆" });
    else setGreeting({ text: "Good night", emoji: "🌙" });

    sessionStorage.removeItem("popupClosedManually");
    getLiveDashboardData();
  }, []);

  // STEP 1: Button click only opens the "Are you sure?" dialog — no API call yet
  const requestConfirmOrders = () => {
    if (selectedOrderIds.length === 0) return;
    setShowConfirmDialog(true);
  };

  // STEP 2: This is the actual API call — only runs after the user taps "Yes, Confirm"
  const handleConfirmOrders = async () => {
    setShowConfirmDialog(false);
    if (selectedOrderIds.length === 0) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          deliveryStatus: "Confirmed"
        })
      });

      if (res.ok) {
        setShowNewOrderPopup(false);
        getLiveDashboardData();
      } else {
        alert("Failed to update status. Please try again.");
      }
    } catch (error) {
      console.error("Network crash checking", error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // MULTIPLE CHECKBOX CONTROLLERS
  const toggleSelectOrder = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter(item => item !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === placedOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(placedOrders.map((o: Order) => o._id));
    }
  };

  const handleApplyCustomRange = () => {
    if (!customStartDate || !customEndDate) return;
    setIsRangeLoading(true);
    setShowDateRangePicker(false);
    const startLabel = new Date(customStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endLabel = new Date(customEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    setActiveRangeLabel(`${startLabel} – ${endLabel}`);
    getLiveDashboardData(customStartDate, customEndDate);
  };

  const handleResetToDefault = () => {
    setCustomStartDate("");
    setCustomEndDate("");
    setActiveRangeLabel("Last 30 days");
    setShowDateRangePicker(false);
    setIsRangeLoading(true);
    getLiveDashboardData();
  };

  const handleExportRevenueToExcel = () => {
    if (!data?.revenueOverview || data.revenueOverview.length === 0) {
      alert("No revenue data to export.");
      return;
    }
    const rows = data.revenueOverview.map((p) => ({
      Date: p.label,
      "Revenue (BDT)": p.revenue,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 14 }, { wch: 16 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Overview");
    const rangeSuffix = activeRangeLabel.replace(/\s+/g, "-").replace(/–/g, "to");
    XLSX.writeFile(workbook, `onecarta-revenue-${rangeSuffix}.xlsx`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://onecarta.shop");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closePopupManually = () => {
    setShowNewOrderPopup(false);
    sessionStorage.setItem("popupClosedManually", "true");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center gap-2 font-bold text-gray-500 text-xs tracking-wider uppercase">
        <Loader2 size={18} className="animate-spin text-indigo-600" /> Syncing OneCarta Live Central Matrix...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 p-4 sm:p-6 lg:p-8 space-y-6 antialiased">
      
      {/* ========================================== */}
      {/* NEW BULK-MANAGED SELECTABLE POPUP MODAL    */}
      {/* ========================================== */}
      {showNewOrderPopup && placedOrders.length > 0 && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs z-100 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-purple-100 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            
            {/* Header section with Select All logic */}
            <div className="p-5 border-b border-purple-50 flex flex-col gap-3 bg-purple-50/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-600 text-white rounded-xl">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-950 text-sm uppercase tracking-wide">
                      New Action Required
                    </h3>
                    <p className="text-[10px] font-bold text-purple-700">You have {placedOrders.length} order(s) waiting to be accepted</p>
                  </div>
                </div>
                <button 
                  onClick={closePopupManually} 
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Select All Toggle Bar */}
              <div className="flex items-center justify-between bg-white/60 border border-purple-100/50 rounded-xl px-3 py-2 text-xs">
                <button 
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-gray-700 font-bold hover:text-purple-700 cursor-pointer transition-colors"
                >
                  {selectedOrderIds.length === placedOrders.length ? (
                    <CheckSquare size={16} className="text-purple-600" />
                  ) : (
                    <Square size={16} className="text-gray-400" />
                  )}
                  Select All Placed Orders
                </button>
                <span className="font-black text-purple-700 font-mono">{selectedOrderIds.length}/{placedOrders.length} Selected</span>
              </div>
            </div>
            
            {/* Scrollable list items with separate checkboxes */}
            <div className="p-5 space-y-3 overflow-y-auto bg-gray-50/50">
              {placedOrders.map((order) => {
                const isChecked = selectedOrderIds.includes(order._id);
                return (
                  <div 
                    key={order._id} 
                    onClick={() => toggleSelectOrder(order._id)}
                    className={`bg-white border rounded-xl p-4 shadow-2xs flex items-start gap-3 transition-all cursor-pointer select-none ${
                      isChecked ? "border-purple-500 bg-purple-50/10" : "border-purple-100 hover:border-purple-300"
                    }`}
                  >
                    <div className="mt-0.5 text-purple-600 shrink-0">
                      {isChecked ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300" />}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                            #{order.orderId}
                          </span>
                          <h4 className="text-sm font-black text-gray-900 mt-1.5">{order.customerName}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-950">BDT {order.totalAmount.toLocaleString()}</p>
                          <span className="text-[10px] font-bold text-gray-400 block mt-0.5">{order.itemsCount} item(s)</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-[11px] pt-2 border-t border-gray-100">
                        <span className="font-semibold text-gray-400">Method: {order.paymentMethod}</span>
                        <span className="font-medium text-purple-600">{getRelativeTime(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Combined actions row footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2.5">
              <button 
                onClick={requestConfirmOrders}
                disabled={selectedOrderIds.length === 0 || isUpdatingStatus}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                Confirm Selected ({selectedOrderIds.length})
              </button>
              
              <button 
                onClick={closePopupManually}
                disabled={isUpdatingStatus}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer"
              >
                Got it, Review Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* "ARE YOU SURE?" CONFIRMATION MODAL          */}
      {/* ========================================== */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs z-110 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-purple-100 shadow-2xl overflow-hidden">
            <div className="p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
                <AlertCircle size={22} />
              </div>
              <h3 className="font-black text-gray-900 text-sm">Are you sure?</h3>
              <p className="text-xs font-medium text-gray-500 leading-relaxed">
                You&apos;re about to confirm{" "}
                <span className="font-black text-gray-800">{selectedOrderIds.length} order(s)</span>.
                This will update their status to{" "}
                <span className="font-black text-purple-700">Confirmed</span>.
              </p>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-center gap-2.5">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer"
              >
                No, go back
              </button>
              <button
                onClick={handleConfirmOrders}
                disabled={isUpdatingStatus}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER BANNER */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="border border-gray-100 rounded-xl p-2 bg-white shadow-2xs flex items-center justify-center h-13 w-35">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="OneCarta Logo" 
              className="h-8 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  const textLogo = document.createElement('div');
                  textLogo.className = "font-black text-lg text-indigo-950 tracking-tighter";
                  textLogo.innerHTML = 'One<span class="text-indigo-600">carta</span>';
                  e.currentTarget.parentElement.appendChild(textLogo);
                }
              }}
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {greeting.text}, Onecarta.shop! {greeting.emoji}
            </h1>
            <p className="text-xs font-semibold text-gray-400 mt-0.5">Trust the process! 🌊</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <a href="https://onecarta.shop" target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-xl text-xs font-bold transition-all hover:bg-indigo-50 flex items-center gap-1.5">
            <Globe size={14} /> Visit Website
          </a>
          <button onClick={handleCopyLink} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer">
            <Copy size={14} /> {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* 2. MATRIX CARDS ROW — LIFETIME TOTALS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div 
          onClick={() => setActiveDetailModal("revenue")}
          className="bg-white border-b-2 border-b-blue-500 border border-gray-100 p-5 rounded-2xl shadow-2xs flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Banknote size={20} /></div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">BDT {(data?.totalRevenue || 0).toLocaleString()}</h3>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">All-time earnings</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveDetailModal("orders")}
          className="bg-white border-b-2 border-b-emerald-500 border border-gray-100 p-5 rounded-2xl shadow-2xs flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><ShoppingCart size={20} /></div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">{data?.totalOrdersCount || 0}</h3>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">All-time orders</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveDetailModal("products")}
          className="bg-white border-b-2 border-b-violet-500 border border-gray-100 p-5 rounded-2xl shadow-2xs flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl"><Package size={20} /></div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Products</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">{data?.totalProducts || 0}</h3>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Live Stock: ৳{(data?.totalStockValue || 0).toLocaleString()}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveDetailModal("customers")}
          className="bg-white border-b-2 border-b-orange-500 border border-gray-100 p-5 rounded-2xl shadow-2xs flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Users size={20} /></div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">{data?.totalCustomers || 0}</h3>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Unique buyers, all-time</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveDetailModal("outOfStock")}
          className="bg-white border-b-2 border-b-slate-400 border border-gray-100 p-5 rounded-2xl shadow-2xs flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><Eye size={20} /></div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Out of Stock</p>
            <h3 className="text-xl font-black text-red-600 mt-0.5">{data?.outOfStockCount || 0}</h3>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Items need re-stock</p>
          </div>
        </div>
      </div>

      {/* 3. CHART & GRAPH SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs lg:col-span-2 space-y-4 relative">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600" /> Revenue Overview
            </h2>
            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowDateRangePicker(!showDateRangePicker); }}
                className="text-[11px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Calendar size={12} /> {activeRangeLabel} <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={handleExportRevenueToExcel}
                className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download size={12} /> Export
              </button>

              {showDateRangePicker && (
                <div
                  className="absolute right-0 top-9 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-20 p-4 space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Custom Date Range</p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleApplyCustomRange}
                      disabled={!customStartDate || !customEndDate}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 text-[11px] font-bold py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="h-64">
            {isRangeLoading ? (
              <div className="h-full flex items-center justify-center gap-2 text-xs font-bold text-gray-400">
                <Loader2 size={16} className="animate-spin text-indigo-600" /> Loading revenue data...
              </div>
            ) : data?.revenueOverview && data.revenueOverview.some(p => p.revenue > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueOverview} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(value: any) => [`BDT ${Number(value).toLocaleString()}`, "Revenue"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#revenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs font-bold text-gray-400">
                No revenue recorded in the last 30 days
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col space-y-4">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <AlertCircle size={16} className="text-violet-600" /> Orders by Status
          </h2>
          <div className="h-64">
            {data?.ordersByStatus && data.ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.ordersByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {data.ordersByStatus.map((entry, index) => (
                      <Cell key={index} fill={STATUS_COLORS[entry.status] || DEFAULT_STATUS_COLOR} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} order(s)`, name]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, fontWeight: 700 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs font-bold text-gray-400">
                No orders yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. RECENT ORDERS TABLE */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <ShoppingCart size={16} className="text-indigo-600" /> Recent Orders
          </h2>
          <Link href="/orders" className="text-[11px] font-black uppercase text-gray-500 tracking-wider hover:text-indigo-600 flex items-center gap-1 transition-colors">
            View All <ArrowRight size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold border-collapse">
            <thead>
              <tr className="text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3 font-black">Order</th>
                <th className="pb-3 font-black">Customer</th>
                <th className="pb-3 font-black">Payment</th>
                <th className="pb-3 font-black">Amount</th>
                <th className="pb-3 font-black">Status</th>
                <th className="pb-3 font-black text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {!data?.recentOrders || data.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 font-medium normal-case">No recent orders found in database</td>
                </tr>
              ) : (
                data.recentOrders.map((order, idx) => {
                  const avatarColors = [
                    "bg-pink-100 text-pink-600",
                    "bg-indigo-100 text-indigo-600",
                    "bg-amber-100 text-amber-600",
                    "bg-cyan-100 text-cyan-600",
                    "bg-violet-100 text-violet-600",
                  ];
                  const isDelivered = order.status === "Completed" || order.status === "Delivered";
                  const isCancelled = order.status === "Cancelled" || order.status === "Returned" || order.status === "Payment Failed";
                  const statusIcon = isDelivered ? <CheckCircle2 size={11} /> : isCancelled ? <XCircle size={11} /> : order.status === "Shipped" ? <Truck size={11} /> : <Clock3 size={11} />;
                  const statusClasses = isDelivered
                    ? "bg-emerald-50 text-emerald-600"
                    : isCancelled
                    ? "bg-red-50 text-red-600"
                    : order.status === "Confirmed" || order.status === "Shipped"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-slate-100 text-slate-600";

                  return (
                    <tr key={order._id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="py-3.5">
                        <Link href="/orders" className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">#{order.orderId}</Link>
                        <span className="block text-[10px] font-medium text-gray-400 normal-case mt-0.5">{order.itemsCount} item{order.itemsCount === 1 ? "" : "s"}</span>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ${avatarColors[idx % avatarColors.length]}`}>
                            {order.customerName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-black text-gray-900">{order.customerName}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${order.paymentMethod === "PAID" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                          {order.paymentMethod === "PAID" ? <CheckCircle2 size={10} /> : <Clock3 size={10} />} {order.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 font-black text-gray-900">BDT {order.totalAmount.toLocaleString()}</td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${statusClasses}`}>
                          {statusIcon} {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-gray-400 font-medium normal-case">
                        {getRelativeTime(order.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. BOTTOM GRID PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Low Stock Panel */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
          <h2 className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center gap-2 pl-2">
            <TriangleAlert size={14} className="text-amber-500" /> Low Stock
          </h2>
          <table className="w-full text-left text-xs font-bold border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-50">
                <th className="pb-2 pl-2 font-black">#</th>
                <th className="pb-2 font-black">Product</th>
                <th className="pb-2 text-right font-black">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {!data?.lowStockItems || data.lowStockItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-gray-400 normal-case">All products have healthy stock level!</td>
                </tr>
              ) : (
                data.lowStockItems.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 pl-2 text-gray-400 font-mono">{index + 1}</td>
                    <td className="py-3 font-bold truncate max-w-30">{item.title}</td>
                    <td className="py-3 text-right text-amber-600 font-black font-mono">{item.stock}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Top Selling Panel */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
          <h2 className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center gap-2 pl-2">
            <Rocket size={14} className="text-emerald-500" /> Top Selling
          </h2>
          <table className="w-full text-left text-xs font-bold border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-50">
                <th className="pb-2 pl-2 font-black">#</th>
                <th className="pb-2 font-black">Product</th>
                <th className="pb-2 text-right font-black">Sold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {!data?.topSellingItems || data.topSellingItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-gray-400 normal-case">No sales recorded yet</td>
                </tr>
              ) : (
                data.topSellingItems.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 pl-2 text-gray-400 font-mono flex items-center justify-center">
                      <span className="w-4 h-4 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center font-black text-[9px]">{index + 1}</span>
                    </td>
                    <td className="py-3 font-bold truncate max-w-30">{item.title}</td>
                    <td className="py-3 text-right text-gray-900 font-black font-mono">{item.sold}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Actions Grid */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <Zap size={14} className="text-indigo-500" /> Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/products" className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 flex flex-col items-center justify-center text-center gap-2 transition-all group">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105"><Plus size={16} /></div>
              <span className="text-[10px] font-bold text-gray-500 tracking-tight">Add Product</span>
            </Link>
            <Link href="/orders" className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 flex flex-col items-center justify-center text-center gap-2 transition-all group">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105"><ShoppingCart size={16} /></div>
              <span className="text-[10px] font-bold text-gray-500 tracking-tight">New Order</span>
            </Link>
            <Link href="/dashboard" className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 flex flex-col items-center justify-center text-center gap-2 transition-all group">
              <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl group-hover:scale-105"><BarChart3 size={16} /></div>
              <span className="text-[10px] font-bold text-gray-500 tracking-tight">Analytics</span>
            </Link>
            <Link href="/categories" className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 flex flex-col items-center justify-center text-center gap-2 transition-all group">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-105"><Folder size={16} /></div>
              <span className="text-[10px] font-bold text-gray-500 tracking-tight">Categories</span>
            </Link>
            <button className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 flex flex-col items-center justify-center text-center gap-2 transition-all group cursor-pointer">
              <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl group-hover:scale-105"><Palette size={16} /></div>
              <span className="text-[10px] font-bold text-gray-500 tracking-tight">Themes</span>
            </button>
            <button className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 flex flex-col items-center justify-center text-center gap-2 transition-all group cursor-pointer">
              <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl group-hover:scale-105"><Settings size={16} /></div>
              <span className="text-[10px] font-bold text-gray-500 tracking-tight">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {activeDetailModal && (
        <div 
          className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setActiveDetailModal(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Revenue Detail */}
            {activeDetailModal === "revenue" && (
              <>
                <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-blue-50/40">
                  <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
                    <Banknote size={16} className="text-blue-600" /> Revenue Details
                  </h3>
                  <button onClick={() => setActiveDetailModal(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all cursor-pointer"><XCircle size={18} /></button>
                </div>
                <div className="p-5 space-y-3 overflow-y-auto">
                  <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 text-center">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">All-Time Revenue</p>
                    <p className="text-2xl font-black text-blue-700 mt-1">BDT {(data?.totalRevenue || 0).toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-gray-100 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Total Orders</p>
                      <p className="text-lg font-black text-gray-900 mt-0.5">{data?.totalOrdersCount || 0}</p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Avg. Order Value</p>
                      <p className="text-lg font-black text-gray-900 mt-0.5">
                        BDT {data?.totalOrdersCount ? Math.round((data.totalRevenue || 0) / data.totalOrdersCount).toLocaleString() : 0}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Orders by Status Detail */}
            {activeDetailModal === "orders" && (
              <>
                <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-emerald-50/40">
                  <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
                    <ShoppingCart size={16} className="text-emerald-600" /> Orders Breakdown
                  </h3>
                  <button onClick={() => setActiveDetailModal(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all cursor-pointer"><XCircle size={18} /></button>
                </div>
                <div className="p-5 space-y-2.5 overflow-y-auto">
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 text-center mb-2">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Total Orders</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{data?.totalOrdersCount || 0}</p>
                  </div>
                  {!data?.ordersByStatus || data.ordersByStatus.length === 0 ? (
                    <p className="text-center text-xs font-bold text-gray-400 py-4">No orders yet</p>
                  ) : (
                    data.ordersByStatus
                      .sort((a, b) => b.count - a.count)
                      .map((s, i) => (
                        <div key={i} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-2.5">
                          <span className="text-xs font-bold text-gray-700">{s.status}</span>
                          <span className="text-xs font-black text-gray-900 bg-gray-50 px-2.5 py-0.5 rounded-full">{s.count}</span>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}

            {/* Products Detail */}
            {activeDetailModal === "products" && (
              <>
                <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-violet-50/40">
                  <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
                    <Package size={16} className="text-violet-600" /> Product Overview
                  </h3>
                  <button onClick={() => setActiveDetailModal(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all cursor-pointer"><XCircle size={18} /></button>
                </div>
                <div className="p-5 space-y-3 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-violet-50/40 border border-violet-100 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-violet-600 uppercase">Active Products</p>
                      <p className="text-lg font-black text-violet-700 mt-0.5">{data?.totalProducts || 0}</p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Categories</p>
                      <p className="text-lg font-black text-gray-900 mt-0.5">{data?.totalCategories || 0}</p>
                    </div>
                  </div>
                  <div className="border border-gray-100 rounded-xl p-4 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Live Stock Value</p>
                    <p className="text-lg font-black text-gray-900 mt-0.5">৳{(data?.totalStockValue || 0).toLocaleString()}</p>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide pt-2">Low Stock Items</p>
                  {!data?.lowStockItems || data.lowStockItems.length === 0 ? (
                    <p className="text-center text-xs font-bold text-gray-400 py-2">All products have healthy stock!</p>
                  ) : (
                    data.lowStockItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-2">
                        <span className="text-xs font-bold text-gray-700 truncate">{item.title}</span>
                        <span className="text-xs font-black text-amber-600">{item.stock} left</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Customers Detail */}
            {activeDetailModal === "customers" && (
              <>
                <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-orange-50/40">
                  <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
                    <Users size={16} className="text-orange-600" /> Customers
                  </h3>
                  <button onClick={() => setActiveDetailModal(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all cursor-pointer"><XCircle size={18} /></button>
                </div>
                <div className="p-5 space-y-2.5 overflow-y-auto">
                  <div className="bg-orange-50/40 border border-orange-100 rounded-xl p-4 text-center mb-2">
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">Unique Customers</p>
                    <p className="text-2xl font-black text-orange-700 mt-1">{data?.totalCustomers || 0}</p>
                  </div>
                  {!data?.customerList || data.customerList.length === 0 ? (
                    <p className="text-center text-xs font-bold text-gray-400 py-4">No customers yet</p>
                  ) : (
                    data.customerList.map((c, i) => (
                      <div key={i} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-2.5">
                        <div>
                          <p className="text-xs font-black text-gray-900">{c.name}</p>
                          <p className="text-[10px] font-medium text-gray-400 font-mono">{c.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-gray-900">BDT {c.totalSpent.toLocaleString()}</p>
                          <p className="text-[10px] font-medium text-gray-400">{c.orderCount} order{c.orderCount === 1 ? "" : "s"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Out of Stock Detail */}
            {activeDetailModal === "outOfStock" && (
              <>
                <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-slate-50">
                  <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
                    <Eye size={16} className="text-slate-600" /> Out of Stock Items
                  </h3>
                  <button onClick={() => setActiveDetailModal(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all cursor-pointer"><XCircle size={18} /></button>
                </div>
                <div className="p-5 space-y-2.5 overflow-y-auto">
                  <div className="bg-red-50/40 border border-red-100 rounded-xl p-4 text-center mb-2">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Items Needing Re-stock</p>
                    <p className="text-2xl font-black text-red-700 mt-1">{data?.outOfStockCount || 0}</p>
                  </div>
                  {!data?.outOfStockItems || data.outOfStockItems.length === 0 ? (
                    <p className="text-center text-xs font-bold text-gray-400 py-4">No products are out of stock!</p>
                  ) : (
                    data.outOfStockItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-2.5">
                        <span className="text-xs font-bold text-gray-700 truncate">{item.title}</span>
                        <span className="text-xs font-black text-red-600">Out of stock</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}