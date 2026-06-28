"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Search, SlidersHorizontal, Eye, MoreVertical, 
  Loader2, ArrowUpDown, ChevronDown, ChevronUp,
  Calendar, Download, CheckCircle2, AlertCircle, Clock,
  User, MapPin, Phone, Clipboard, FileText, Check, X, ShoppingBag,
  Plus, Package, Users, ExternalLink, Trash2, Mail, ShieldCheck, Truck, Image as ImageIcon,
  PackageCheck, PackageX, CircleDot, History
} from "lucide-react";

interface OrderItem {
  name: string;
  qty: number;
  unitPrice: number;
}

interface StatusHistoryEntry {
  status: string;
  changedAt: string;
}

interface Order {
  _id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  totalAmount: number;
  deliveryCharge: number;
  orderType?: "In shop" | "Online";
  paymentStatus: "PAID" | "PENDING" | "FAILED";
  deliveryStatus: "Placed" | "On Hold" | "Confirmed" | "Shipped" | "Delivered" | "Completed" | "Cancelled" | "Returned" | "Payment OnProcess" | "Payment Failed";
  createdAt: string;
  updatedAt?: string;
  // REAL-TIME STATUS TIMELINE: present on orders created/updated after this feature
  // shipped. Older orders may not have this array at all — handled gracefully below.
  statusHistory?: StatusHistoryEntry[];
  items: OrderItem[];
}

interface ProductCategory {
  _id: string;
  name: string;
  slug?: string;
}

interface Product {
  _id: string;
  title: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  slug: string;
  images?: string[];
  sku?: string;
  description?: string;
  categoryId?: string | null;
  category?: ProductCategory | null; // populated by /api/products via $lookup
}

interface OrderLineItem {
  product: Product;
  qty: number;
}

// Canonical status progression used to render the timeline in a sensible order
// for "forward" flows. Cancelled/Returned/Payment Failed are terminal/branch
// states and are always rendered last, tagged distinctly.
const STATUS_FLOW_ORDER = [
  "Placed",
  "On Hold",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Completed",
];
const TERMINAL_STATUSES = ["Cancelled", "Returned", "Payment Failed"];

function getStatusTimelineIcon(status: string) {
  switch (status) {
    case "Placed": return <ShoppingBag size={13} />;
    case "On Hold": return <Clock size={13} />;
    case "Confirmed": return <CheckCircle2 size={13} />;
    case "Shipped": return <Truck size={13} />;
    case "Delivered": return <PackageCheck size={13} />;
    case "Completed": return <PackageCheck size={13} />;
    case "Cancelled": return <PackageX size={13} />;
    case "Returned": return <PackageX size={13} />;
    case "Payment OnProcess": return <Clock size={13} />;
    case "Payment Failed": return <PackageX size={13} />;
    default: return <CircleDot size={13} />;
  }
}

function getStatusTimelineColor(status: string) {
  switch (status) {
    case "Placed": return { dot: "bg-purple-600", ring: "ring-purple-100", text: "text-purple-700" };
    case "On Hold": return { dot: "bg-amber-500", ring: "ring-amber-100", text: "text-amber-700" };
    case "Confirmed": return { dot: "bg-blue-600", ring: "ring-blue-100", text: "text-blue-700" };
    case "Shipped": return { dot: "bg-cyan-600", ring: "ring-cyan-100", text: "text-cyan-700" };
    case "Delivered": return { dot: "bg-lime-600", ring: "ring-lime-100", text: "text-lime-700" };
    case "Completed": return { dot: "bg-emerald-600", ring: "ring-emerald-100", text: "text-emerald-700" };
    case "Cancelled": return { dot: "bg-pink-600", ring: "ring-pink-100", text: "text-pink-700" };
    case "Returned": return { dot: "bg-orange-600", ring: "ring-orange-100", text: "text-orange-700" };
    case "Payment OnProcess": return { dot: "bg-indigo-600", ring: "ring-indigo-100", text: "text-indigo-700" };
    case "Payment Failed": return { dot: "bg-red-600", ring: "ring-red-100", text: "text-red-700" };
    default: return { dot: "bg-gray-400", ring: "ring-gray-100", text: "text-gray-600" };
  }
}

function formatTimelineDate(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatTimelineTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Builds the ordered list of timeline steps to render for a given order.
// - If the order HAS statusHistory (new orders): use the real recorded entries,
//   in the order they actually happened, each with its real timestamp.
// - If the order has NO statusHistory (legacy orders, created before this
//   feature): fall back to just two known points — "Placed" at createdAt, and
//   the current deliveryStatus at updatedAt (if different from Placed) — and
//   mark everything else as not tracked.
function buildTimelineSteps(order: Order) {
  if (order.statusHistory && order.statusHistory.length > 0) {
    return {
      steps: order.statusHistory.map((entry) => ({
        status: entry.status,
        changedAt: entry.changedAt,
        tracked: true,
      })),
      isLegacy: false,
    };
  }

  // Legacy fallback — no recorded history
  const steps: { status: string; changedAt: string; tracked: boolean }[] = [
    { status: "Placed", changedAt: order.createdAt, tracked: true },
  ];

  if (order.deliveryStatus !== "Placed") {
    steps.push({
      status: order.deliveryStatus,
      changedAt: order.updatedAt || order.createdAt,
      tracked: true,
    });
  }

  return { steps, isLegacy: true };
}

export default function OrderManagerMatrix() {
  const [view, setView] = useState<"list" | "create">("list");
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState("All Orders");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [hoveredCustomerId, setHoveredCustomerId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [showBulkStatusDropdown, setShowBulkStatusDropdown] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModalCategory, setSelectedModalCategory] = useState("All products");

  // Products currently added to the order being built (supports multiple distinct products)
  const [orderLineItems, setOrderLineItems] = useState<OrderLineItem[]>([]);
  const [lastAddedProductId, setLastAddedProductId] = useState<string | null>(null);

  // Order Summary inputs (drive the live Grand Total calculation)
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [vatPercent, setVatPercent] = useState<number>(0);
  const [vatAmount, setVatAmount] = useState<number>(0);
  const [deliveryZone, setDeliveryZone] = useState<"Inside Dhaka" | "Outside Dhaka" | "Custom">("Inside Dhaka");
  const [deliveryAmount, setDeliveryAmount] = useState<number>(80);
  const [partialPaidAmount, setPartialPaidAmount] = useState<number>(0);

  const [openSections, setOpenSections] = useState({
    products: true,
    summary: true,
    note: true,
    info: true,
    customer: true
  });

  const [formOrderType, setFormOrderType] = useState<"In shop" | "Online">("In shop");
  const [formPaymentStatus, setFormPaymentStatus] = useState<"Fully Paid" | "Partial">("Fully Paid");
  const [formMarkAsFraud, setFormMarkAsFraud] = useState(false);
  const [formOrderStatus, setFormOrderStatus] = useState<Order["deliveryStatus"]>("Placed");
  const [formOrderNote, setFormOrderNote] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
      setShowBulkStatusDropdown(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Sync state data streams from backend repository routes.
  // NOTE: orders and products are fetched INDEPENDENTLY (not via a single Promise.all)
  // so that a failure on one endpoint (e.g. /api/orders returning 404) never wipes out
  // a successful response from the other endpoint (e.g. /api/products).
  async function loadOrders() {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error(`Orders fetch failed with status ${res.status}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setOrders([]);
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error(`Products fetch failed with status ${res.status}`);
      const data = await res.json();
      // Defensive: handle either a raw array or a { products: [...] } wrapper shape
      const productList: Product[] = Array.isArray(data) ? data : (data.products || []);
      setProducts(productList);
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
    }
  }

  useEffect(() => {
    Promise.all([loadOrders(), loadProducts()]).finally(() => setIsLoading(false));
  }, []);

  const tabStatuses = [
    { name: "All Orders", textClass: "text-gray-700" },
    { name: "Placed", textClass: "text-purple-600" },
    { name: "On Hold", textClass: "text-amber-600" },
    { name: "Confirmed", textClass: "text-blue-600" },
    { name: "Shipped", textClass: "text-cyan-600" },
    { name: "Delivered", textClass: "text-lime-600" },
    { name: "Completed", textClass: "text-emerald-600" },
    { name: "Cancelled", textClass: "text-pink-600" },
    { name: "Returned", textClass: "text-orange-600" },
    { name: "Payment OnProcess", textClass: "text-indigo-600" },
    { name: "Payment Failed", textClass: "text-red-600" }
  ];

  const modalCategories = ["All products", "Beauty & Care", "Electronics", "Fashion", "Bags & Luggage"];

  // Defensive product matching selector algorithm.
  // `product.category` now comes populated from the API as { _id, name, slug } via $lookup,
  // so we read `product.category.name` (not the old, nonexistent `product.category` string).
  const filteredModalProducts = products.filter((product) => {
    if (!product) return false;

    const titleText = product.title ? String(product.title).toLowerCase() : "";
    const matchesSearch = titleText.includes(searchQuery.toLowerCase().trim());

    if (selectedModalCategory === "All products") {
      return matchesSearch;
    }

    const productCategoryName = product.category?.name
      ? String(product.category.name).toLowerCase().trim()
      : "";

    const targetCategoryString = selectedModalCategory.toLowerCase().trim();
    return matchesSearch && productCategoryName === targetCategoryString;
  });

  // ---- Dashboard stats (TODAY only) ----
  const todayDate = new Date();
  const todayDateStr = todayDate.toDateString(); // used to compare against order.createdAt's date

  const formattedTodayDate = (() => {
    const day = todayDate.getDate();
    const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
    const month = todayDate.toLocaleDateString("en-US", { month: "long" });
    return `${day}${suffix} ${month}`;
  })();

  const todaysOrders = orders.filter((order) => {
    if (!order.createdAt) return false;
    return new Date(order.createdAt).toDateString() === todayDateStr;
  });

  const todaysOrdersCount = todaysOrders.length;
  const todaysTotalAmount = todaysOrders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const todaysUniqueCustomerCount = new Set(
    todaysOrders.map((o) => o.customerPhone).filter(Boolean)
  ).size;

  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === "All Orders" || order.deliveryStatus.toLowerCase() === activeTab.toLowerCase();
    if (!matchesTab) return false;

    const query = orderSearchQuery.trim().toLowerCase();
    if (!query) return true;

    const orderIdMatch = order.orderId ? String(order.orderId).toLowerCase().includes(query) : false;
    const phoneMatch = order.customerPhone ? String(order.customerPhone).toLowerCase().includes(query) : false;
    const nameMatch = order.customerName ? String(order.customerName).toLowerCase().includes(query) : false;

    return orderIdMatch || phoneMatch || nameMatch;
  });

  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastOrder = currentPage * itemsPerPage;
  const indexOfFirstOrder = indexOfLastOrder - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  const handleSelectRow = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllRows = () => {
    if (selectedOrderIds.length === currentOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(currentOrders.map(o => o._id));
    }
  };

  const handleBulkStatusUpdate = async (status: Order["deliveryStatus"]) => {
    const idsToUpdate = [...selectedOrderIds];

    // Optimistic UI update so the change feels instant
    setOrders(prev => prev.map(o => 
      idsToUpdate.includes(o._id) ? { ...o, deliveryStatus: status } : o
    ));
    setSelectedOrderIds([]);
    setShowBulkStatusDropdown(false);

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: idsToUpdate, deliveryStatus: status }),
      });
      if (!res.ok) throw new Error("Status update failed");
      // Re-sync with DB to be certain the change persisted
      await loadOrders();
    } catch (err) {
      console.error("Failed to update order status:", err);
      alert("Status update failed to save. Please try again.");
      await loadOrders(); // revert optimistic update back to actual DB state
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Order ID #${text} successfully copied to clipboard matrix`);
  };

  // Export orders to an Excel (.xlsx) file. If specific orders are selected (checkboxes),
  // only those are exported; otherwise the currently filtered/visible list is exported.
  const handleExportToExcel = (ordersToExport: Order[]) => {
    if (ordersToExport.length === 0) {
      alert("No orders to export.");
      return;
    }

    const rows = ordersToExport.map((order) => ({
      "Order ID": `#${order.orderId}`,
      "Customer Name": order.customerName,
      "Phone": order.customerPhone,
      "Address": order.customerAddress,
      "Order Type": order.orderType === "Online" ? "Online" : "In shop",
      "Date": new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      "Status": order.deliveryStatus,
      "Payment Status": order.paymentStatus,
      "Items": order.items.map((item) => `${item.name} (x${item.qty})`).join(", "),
      "Items Count": order.items.length,
      "Delivery Charge (BDT)": order.deliveryCharge,
      "Total Amount (BDT)": order.totalAmount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Reasonable column widths so the export is readable without manual resizing
    worksheet["!cols"] = [
      { wch: 12 }, // Order ID
      { wch: 20 }, // Customer Name
      { wch: 16 }, // Phone
      { wch: 28 }, // Address
      { wch: 11 }, // Order Type
      { wch: 14 }, // Date
      { wch: 14 }, // Status
      { wch: 14 }, // Payment Status
      { wch: 40 }, // Items
      { wch: 12 }, // Items Count
      { wch: 18 }, // Delivery Charge
      { wch: 16 }, // Total Amount
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    const todayStamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `onecarta-orders-${todayStamp}.xlsx`);
  };

  const getStatusClasses = (status: Order["deliveryStatus"]) => {
    switch (status) {
      case "On Hold": return "bg-amber-50 text-amber-600 border-amber-100";
      case "Completed": return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Confirmed": return "bg-blue-50 text-blue-600 border-blue-100";
      case "Shipped": return "bg-cyan-50 text-cyan-600 border-cyan-100";
      case "Placed": return "bg-purple-50 text-purple-600 border-purple-100";
      case "Delivered": return "bg-lime-50 text-lime-600 border-lime-100";
      case "Cancelled": return "bg-pink-50 text-pink-600 border-pink-100";
      case "Returned": return "bg-orange-50 text-orange-600 border-orange-100";
      case "Payment OnProcess": return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case "Payment Failed": return "bg-red-50 text-red-600 border-red-100";
      default: return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  const toggleAccordion = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ---- Order line item handlers (Add to Receipt / qty +- / remove) ----
  const handleAddProductToOrder = (product: Product) => {
    setOrderLineItems(prev => {
      const existing = prev.find(line => line.product._id === product._id);
      if (existing) {
        return prev.map(line =>
          line.product._id === product._id ? { ...line, qty: line.qty + 1 } : line
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    setLastAddedProductId(product._id);
    // Brief visual confirmation only; modal stays open so more products can be added
    setTimeout(() => setLastAddedProductId(null), 1200);
  };

  const handleIncrementQty = (productId: string) => {
    setOrderLineItems(prev =>
      prev.map(line => (line.product._id === productId ? { ...line, qty: line.qty + 1 } : line))
    );
  };

  const handleDecrementQty = (productId: string) => {
    setOrderLineItems(prev =>
      prev
        .map(line => (line.product._id === productId ? { ...line, qty: line.qty - 1 } : line))
        .filter(line => line.qty > 0)
    );
  };

  const handleRemoveLineItem = (productId: string) => {
    setOrderLineItems(prev => prev.filter(line => line.product._id !== productId));
  };

  // ---- Live totals ----
  const getLineUnitPrice = (product: Product) =>
    product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price;

  const productsSubtotal = orderLineItems.reduce(
    (sum, line) => sum + getLineUnitPrice(line.product) * line.qty,
    0
  );

  const grandTotal = Math.max(
    0,
    productsSubtotal - discountAmount + vatAmount + deliveryAmount
  );

  // Discount and VAT each support two synced fields: a % field and a flat BDT amount field.
  // Editing either one recalculates the other against the products subtotal, so the user
  // can use % OR flat amount interchangeably — both stay accurate at all times.
  const handleDiscountPercentChange = (value: number) => {
    setDiscountPercent(value);
    setDiscountAmount(productsSubtotal > 0 ? Math.round((productsSubtotal * value) / 100) : 0);
  };

  const handleDiscountAmountChange = (value: number) => {
    setDiscountAmount(value);
    setDiscountPercent(productsSubtotal > 0 ? Math.round((value / productsSubtotal) * 100 * 100) / 100 : 0);
  };

  const handleVatPercentChange = (value: number) => {
    setVatPercent(value);
    setVatAmount(productsSubtotal > 0 ? Math.round((productsSubtotal * value) / 100) : 0);
  };

  const handleVatAmountChange = (value: number) => {
    setVatAmount(value);
    setVatPercent(productsSubtotal > 0 ? Math.round((value / productsSubtotal) * 100 * 100) / 100 : 0);
  };

  // Delivery zone presets: switching zone auto-fills the standard rate; "Custom" unlocks free entry.
  const handleDeliveryZoneChange = (zone: "Inside Dhaka" | "Outside Dhaka" | "Custom") => {
    setDeliveryZone(zone);
    if (zone === "Inside Dhaka") setDeliveryAmount(80);
    else if (zone === "Outside Dhaka") setDeliveryAmount(120);
    // Custom: leave deliveryAmount as-is so the user can type their own value
  };

  const resetOrderForm = () => {
    setOrderLineItems([]);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setVatPercent(0);
    setVatAmount(0);
    setDeliveryZone("Inside Dhaka");
    setDeliveryAmount(80);
    setPartialPaidAmount(0);
    setFormPaymentStatus("Fully Paid");
    setFormOrderType("In shop");
    setFormMarkAsFraud(false);
    setFormOrderStatus("Placed");
    setFormOrderNote("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerAddress("");
    setSubmitError("");
  };

  const handleCancelCreateOrder = () => {
    resetOrderForm();
    setView("list");
  };

  const handleCreateOrder = async () => {
    setSubmitError("");

    if (orderLineItems.length === 0) {
      setSubmitError("Please add at least one product to the order.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setSubmitError("Customer name, phone, and address are required.");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const payload = {
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items: orderLineItems.map((line) => ({
          productId: line.product._id,
          name: line.product.title,
          qty: line.qty,
          unitPrice: getLineUnitPrice(line.product),
        })),
        orderType: formOrderType,
        deliveryZone,
        deliveryCharge: deliveryAmount,
        discountPercent,
        discountAmount,
        vatPercent,
        vatAmount,
        paymentStatus: formPaymentStatus,
        partialPaidAmount,
        deliveryStatus: formOrderStatus,
        isFraud: formMarkAsFraud,
        note: formOrderNote,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create order");
      }

      await loadOrders();
      resetOrderForm();
      setView("list");
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong while creating the order.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center gap-2 font-semibold text-gray-500 text-sm tracking-wider uppercase">
        <Loader2 size={18} className="animate-spin text-indigo-600" /> Syncing OneCarta Order Matrix Flows...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-4 sm:p-6 lg:p-8 select-none relative">
      
      {/* ==================== SCREEN 1: ORDER DATA LIST VIEW ==================== */}
      {view === "list" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Orders</h1>
              <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{orders.length}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setView("create")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Plus size={15} /> Create Order
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center gap-4 shadow-3xs">
              <div className="p-3.5 bg-purple-50 rounded-xl text-purple-600"><Calendar size={22} /></div>
              <div>
                <p className="text-xs text-gray-400 font-medium tracking-tight">Today's date</p>
                <p className="text-[15px] font-semibold text-gray-900 mt-0.5">{formattedTodayDate}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center gap-4 shadow-3xs">
              <div className="p-3.5 bg-purple-50 rounded-xl text-purple-600"><Package size={22} /></div>
              <div>
                <p className="text-xs text-gray-400 font-medium tracking-tight">Today's Orders</p>
                <p className="text-[15px] font-semibold text-gray-900 mt-0.5">{todaysOrdersCount}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center gap-4 shadow-3xs">
              <div className="p-3.5 bg-purple-50 rounded-xl text-purple-600"><span className="text-lg font-bold">৳</span></div>
              <div>
                <p className="text-xs text-gray-400 font-medium tracking-tight">Today's Total Amount</p>
                <p className="text-[15px] font-semibold text-gray-900 mt-0.5">৳{todaysTotalAmount.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center gap-4 shadow-3xs">
              <div className="p-3.5 bg-purple-50 rounded-xl text-purple-600"><Users size={22} /></div>
              <div>
                <p className="text-xs text-gray-400 font-medium tracking-tight">Today's Customers Served</p>
                <p className="text-[15px] font-semibold text-gray-900 mt-0.5">{todaysUniqueCustomerCount}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex items-center bg-white border border-gray-200 rounded-xl shadow-3xs overflow-hidden">
                <select className="appearance-none pl-4 pr-8 py-2.5 text-sm font-medium text-gray-600 bg-white outline-none border-r border-gray-100 cursor-pointer">
                  <option>All Fields</option>
                </select>
                <div className="absolute left-16 pointer-events-none text-gray-400"><ChevronDown size={14} /></div>
                <div className="flex items-center pl-3 text-gray-400"><Search size={16} /></div>
                <input 
                  type="text" 
                  value={orderSearchQuery}
                  onChange={(e) => { setOrderSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search with order ID, name, or phone number..." 
                  className="pl-2 pr-9 py-2.5 text-sm font-medium text-gray-707 outline-none w-64 bg-white" 
                />
                {orderSearchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setOrderSearchQuery("")}
                    className="absolute right-2.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end overflow-visible">
              {selectedOrderIds.length > 0 ? (
                <div className="flex items-center gap-2 animate-fadeIn overflow-visible relative">
                  <button 
                    type="button" 
                    onClick={() => handleExportToExcel(orders.filter(o => selectedOrderIds.includes(o._id)))}
                    className="px-3.5 py-2 border border-gray-200 bg-white text-sm font-medium rounded-xl text-gray-700 flex items-center gap-1.5 shadow-3xs cursor-pointer hover:bg-gray-50"
                  >
                    <Download size={15} /> Download ({selectedOrderIds.length})
                  </button>
                  <div className="relative overflow-visible">
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setShowBulkStatusDropdown(!showBulkStatusDropdown); }}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      Update Status <ChevronDown size={14} />
                    </button>
                    
                    {showBulkStatusDropdown && (
                      <div className="absolute right-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                        {tabStatuses.slice(1).map(status => (
                          <button 
                            key={status.name} 
                            type="button" 
                            onClick={() => handleBulkStatusUpdate(status.name as any)} 
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Check size={13} className="text-gray-400" /> {status.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSelectedOrderIds([])}
                    className="text-sm font-medium text-gray-55 hover:text-gray-800 flex items-center gap-1 cursor-pointer ml-1"
                  >
                    <X size={15} /> Clear
                  </button>
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => handleExportToExcel(filteredOrders)}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-sm font-medium rounded-xl text-gray-600 flex items-center gap-1.5 shadow-3xs cursor-pointer hover:bg-gray-50"
                >
                  <Download size={15} /> Export
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#f1f3f5]/60 p-1.5 rounded-2xl border border-gray-100 pb-1.5 mt-5 overflow-x-auto shadow-3xs">
            {tabStatuses.map((tab) => (
              <button 
                key={tab.name} 
                type="button" 
                onClick={() => { setActiveTab(tab.name); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.name 
                    ? "bg-white border border-gray-200 text-gray-900 shadow-3xs" 
                    : `${tab.textClass} hover:bg-white/40`
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-visible mt-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 text-gray-400 uppercase tracking-wider border-b border-gray-100 text-xs font-semibold select-none">
                    <th className="p-4 w-12 text-center">
                      <input type="checkbox" checked={selectedOrderIds.length === currentOrders.length && currentOrders.length > 0} onChange={handleSelectAllRows} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                    </th>
                    <th className="p-4">Order</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4 w-28 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600 overflow-visible">
                  {currentOrders.map((order, orderIndex) => (
                    <tr key={order._id} className={`hover:bg-gray-50/40 transition-colors group ${selectedOrderIds.includes(order._id) ? "bg-indigo-50/30 hover:bg-indigo-50/40" : ""}`}>
                      <td className="p-4 text-center">
                        <input type="checkbox" checked={selectedOrderIds.includes(order._id)} onChange={() => handleSelectRow(order._id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 group-hover:text-indigo-600 transition-colors"><ShoppingBag size={16} /></div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span onClick={() => setSelectedOrderDetails(order)} className="font-semibold text-gray-900 text-sm hover:text-indigo-600 transition-colors cursor-pointer">#{order.orderId}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium tracking-tight ${
                                order.orderType === "Online" 
                                  ? "bg-blue-50 text-blue-600" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {order.orderType === "Online" ? "Online" : "In shop"}
                              </span>
                              <Eye size={14} onClick={() => setSelectedOrderDetails(order)} className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer ml-0.5" />
                            </div>
                            <span className="text-xs font-mono text-gray-400 block mt-0.5">ORD-002 • {order.items.length} items</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 relative overflow-visible">
                        <div 
                          className="inline-flex items-center gap-2.5 cursor-pointer"
                          onMouseEnter={() => setHoveredCustomerId(order._id)}
                          onMouseLeave={() => setHoveredCustomerId(null)}
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-50 flex items-center justify-center text-xs font-semibold text-gray-500 font-mono">TR</div>
                          <div>
                            <span className="font-medium text-gray-900 text-sm block">{order.customerName}</span>
                            <span className="text-xs font-mono text-gray-400 block mt-0.5">{order.customerPhone}</span>
                          </div>

                          {hoveredCustomerId === order._id && (
                            <div className={`absolute left-4 w-60 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-4 animate-fadeIn pointer-events-none border-t-2 border-t-indigo-600/20 text-left ${
                              orderIndex >= currentOrders.length - 2 ? "bottom-14" : "top-14"
                            }`}>
                              <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm font-mono">TR</div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{order.customerName}</p>
                                  <p className="text-xs text-gray-400 font-medium">Online Customer</p>
                                </div>
                              </div>
                              <div className="mt-3 space-y-2 text-xs font-medium text-gray-600">
                                <div className="flex items-center gap-2.5"><Phone size={13} className="text-gray-400" /> <span>{order.customerPhone}</span></div>
                                <div className="flex items-center gap-2.5"><MapPin size={13} className="text-gray-400" /> <span>{order.customerAddress}</span></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-xs font-medium text-gray-500">
                        <span className="block text-gray-800 font-medium">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span className="block text-[11px] text-gray-400 font-mono mt-0.5">02:27 PM</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusClasses(order.deliveryStatus)}`}>
                          {order.deliveryStatus}
                        </span>
                      </td>
                      <td className="p-4"><span className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium text-gray-500">Own</span></td>
                      <td className="p-4">
                        <span className="font-semibold text-gray-900 block">৳{order.totalAmount.toFixed(2)}</span>
                        <span className="text-xs text-gray-400 block mt-0.5">+৳{order.deliveryCharge} delivery</span>
                      </td>

                      <td className="p-4 text-center relative overflow-visible pr-6">
                        <div className="inline-flex items-center gap-2 overflow-visible">
                          <button type="button" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 border border-transparent hover:border-gray-100 rounded-lg transition-all cursor-pointer"><FileText size={15} /></button>
                          <button type="button" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 border border-transparent hover:border-gray-100 rounded-lg transition-all cursor-pointer"><ExternalLink size={15} /></button>
                          <div className="relative overflow-visible">
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === order._id ? null : order._id); }}
                              className={`p-1.5 border rounded-xl transition-all shadow-3xs bg-white text-gray-400 cursor-pointer hover:text-indigo-600 ${
                                activeMenuId === order._id ? "border-purple-600 ring-2 ring-purple-100 text-purple-600" : "border-gray-200"
                              }`}
                            >
                              <MoreVertical size={15} />
                            </button>
                            {activeMenuId === order._id && (
                              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 text-left animate-fadeIn">
                                <button type="button" onClick={() => setSelectedOrderDetails(order)} className="w-full px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer">
                                  <Eye size={14} className="text-gray-400" /> View Order
                                </button>
                                <button type="button" onClick={() => copyToClipboard(order.orderId)} className="w-full px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer">
                                  <Clipboard size={14} className="text-gray-400" /> Copy Order ID
                                </button>
                                <div className="border-t border-gray-50 my-1"></div>
                                <button type="button" className="w-full px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer">
                                  <FileText size={14} className="text-gray-400" /> Print Invoice
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 px-2 text-xs text-gray-500 font-medium select-none">
            <div className="flex items-center gap-2">
              <span>Showing {totalItems > 0 ? indexOfFirstOrder + 1 : 0}–{Math.min(indexOfLastOrder, totalItems)} of {totalItems}</span>
              <div className="relative inline-block">
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none text-gray-700 cursor-pointer font-semibold transition-all">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400"><ChevronDown size={14} /></div>
              </div>
              <span>per page</span>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} className="flex items-center gap-1 hover:text-indigo-600 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors cursor-pointer disabled:cursor-not-allowed"><ChevronUp className="-rotate-90" size={14} /> Previous</button>
              <span className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white font-semibold text-gray-700 text-center">{currentPage}</span>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} className="flex items-center gap-1 hover:text-indigo-600 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors cursor-pointer disabled:cursor-not-allowed">Next <ChevronUp className="rotate-90" size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SCREEN 2: CREATE ORDER FORM VIEW ==================== */}
      {view === "create" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={handleCancelCreateOrder}
                className="p-2 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors text-gray-500 cursor-pointer"
              >
                <ChevronUp className="-rotate-90" size={16} />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Create Order</h1>
            </div>
            <div className="flex items-center gap-3">
              {submitError && (
                <span className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
                  <AlertCircle size={14} /> {submitError}
                </span>
              )}
              <button 
                type="button" 
                onClick={handleCancelCreateOrder}
                disabled={isSubmittingOrder}
                className="px-4 py-2 border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleCreateOrder}
                disabled={isSubmittingOrder}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingOrder && <Loader2 size={14} className="animate-spin" />}
                {isSubmittingOrder ? "Creating..." : "Create"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleAccordion("products")}
                  className="p-4.5 flex items-center justify-between bg-white cursor-pointer select-none group border-b border-gray-50"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Products</h3>
                  <span className="text-gray-400 group-hover:text-gray-600">
                    {openSections.products ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {openSections.products && (
                  orderLineItems.length === 0 ? (
                    <div className="p-8 text-center bg-white animate-slideDown flex flex-col items-center justify-center min-h-65">
                      <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 text-gray-400 mb-3">
                        <Plus size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">No Products Added</h4>
                      <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">Start building this order by adding products from your inventory</p>
                      <button 
                        type="button" 
                        onClick={() => setShowProductModal(true)}
                        className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus size={14} /> Add Your First Product
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white animate-slideDown">
                      <div className="divide-y divide-gray-50">
                        {orderLineItems.map((line) => {
                          const unitPrice = getLineUnitPrice(line.product);
                          return (
                            <div key={line.product._id} className="p-4 flex items-center gap-4">
                              <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-gray-300">
                                {line.product.images && line.product.images[0] ? (
                                  <img src={line.product.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon size={20} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-gray-900 text-xs line-clamp-1">{line.product.title}</h5>
                                <span className="text-[11px] text-gray-400 font-mono mt-0.5 block">৳{unitPrice} / unit</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-1">
                                <button 
                                  type="button" 
                                  onClick={() => handleDecrementQty(line.product._id)}
                                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-colors cursor-pointer font-bold text-sm"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-xs font-bold text-gray-800">{line.qty}</span>
                                <button 
                                  type="button" 
                                  onClick={() => handleIncrementQty(line.product._id)}
                                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-colors cursor-pointer font-bold text-sm"
                                >
                                  +
                                </button>
                              </div>
                              <span className="font-bold text-gray-900 text-sm w-20 text-right">৳{(unitPrice * line.qty).toFixed(2)}</span>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveLineItem(line.product._id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-4 border-t border-gray-50 flex items-center justify-between">
                        <button 
                          type="button" 
                          onClick={() => setShowProductModal(true)}
                          className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus size={14} /> Add More Products
                        </button>
                        <span className="text-xs font-bold text-gray-500">Subtotal: <span className="text-gray-900">৳{productsSubtotal.toFixed(2)}</span></span>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleAccordion("summary")}
                  className="p-4.5 flex items-center justify-between bg-white cursor-pointer select-none group border-b border-gray-50"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Order Summary</h3>
                  <span className="text-gray-400 group-hover:text-gray-600">
                    {openSections.summary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {openSections.summary && (
                  <div className="p-5 bg-white animate-slideDown space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="p-1 bg-orange-50 text-orange-500 rounded-md text-[10px] font-black">%</span> Discount
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 relative flex items-center">
                            <input 
                              type="number" 
                              placeholder="0" 
                              value={discountPercent || ""}
                              onChange={(e) => handleDiscountPercentChange(Number(e.target.value) || 0)}
                              className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:border-purple-600 bg-white" 
                            />
                            <span className="absolute right-3 text-xs font-bold text-gray-400">%</span>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">Amount</div>
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-xs font-bold text-gray-400">BDT</span>
                          <input 
                            type="number" 
                            placeholder="0" 
                            value={discountAmount || ""}
                            onChange={(e) => handleDiscountAmountChange(Number(e.target.value) || 0)}
                            className="w-full pl-11 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-white text-gray-800" 
                          />
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="p-1 bg-purple-50 text-purple-500 rounded-md text-[10px] font-black">৳</span> VAT / Tax
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 relative flex items-center">
                            <input 
                              type="number" 
                              placeholder="0" 
                              value={vatPercent || ""}
                              onChange={(e) => handleVatPercentChange(Number(e.target.value) || 0)}
                              className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:border-purple-600 bg-white" 
                            />
                            <span className="absolute right-3 text-xs font-bold text-gray-400">%</span>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">Amount</div>
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-xs font-bold text-gray-400">BDT</span>
                          <input 
                            type="number" 
                            placeholder="0" 
                            value={vatAmount || ""}
                            onChange={(e) => handleVatAmountChange(Number(e.target.value) || 0)}
                            className="w-full pl-11 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-white text-gray-800" 
                          />
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Truck size={14} className="text-blue-500" /> Delivery
                        </p>
                        <div className="relative">
                          <select 
                            value={deliveryZone}
                            onChange={(e) => handleDeliveryZoneChange(e.target.value as "Inside Dhaka" | "Outside Dhaka" | "Custom")}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 bg-white appearance-none outline-none focus:border-purple-600 cursor-pointer"
                          >
                            <option value="Inside Dhaka">Inside Dhaka (৳80)</option>
                            <option value="Outside Dhaka">Outside Dhaka (৳120)</option>
                            <option value="Custom">Custom</option>
                          </select>
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400"><ChevronDown size={14} /></div>
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-xs font-bold text-gray-400">BDT</span>
                          <input 
                            type="number" 
                            placeholder="0" 
                            value={deliveryAmount || ""}
                            disabled={deliveryZone !== "Custom"}
                            onChange={(e) => setDeliveryAmount(Number(e.target.value) || 0)}
                            className="w-full pl-11 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-white text-gray-800 disabled:bg-gray-50 disabled:text-gray-500" 
                          />
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-500" /> Payment
                        </p>
                        <div className="flex bg-gray-100/70 p-1 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 select-none">
                          <button 
                            type="button" 
                            onClick={() => setFormPaymentStatus("Fully Paid")}
                            className={`flex-1 py-1.5 rounded-lg text-center flex items-center justify-center gap-1.5 transition-all ${
                              formPaymentStatus === "Fully Paid" ? "bg-white text-gray-900 shadow-3xs" : "hover:text-gray-800"
                            }`}
                          >
                            <CheckCircle2 size={14} className={formPaymentStatus === "Fully Paid" ? "text-emerald-500" : "text-gray-400"} /> Fully Paid
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setFormPaymentStatus("Partial")}
                            className={`flex-1 py-1.5 rounded-lg text-center flex items-center justify-center gap-1.5 transition-all ${
                              formPaymentStatus === "Partial" ? "bg-white text-gray-900 shadow-3xs" : "hover:text-gray-800"
                            }`}
                          >
                            <Clock size={14} className={formPaymentStatus === "Partial" ? "text-amber-500" : "text-gray-400"} /> Partial
                          </button>
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-xs font-bold text-gray-400">BDT</span>
                          <input 
                            type="number" 
                            placeholder="0" 
                            value={formPaymentStatus === "Fully Paid" ? grandTotal.toFixed(0) : (partialPaidAmount || "")}
                            disabled={formPaymentStatus === "Fully Paid"}
                            onChange={(e) => setPartialPaidAmount(Number(e.target.value) || 0)}
                            className="w-full pl-11 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-white text-gray-800 disabled:bg-gray-50 disabled:text-gray-400" 
                          />
                        </div>
                      </div>

                    </div>

                    <div className="flex items-center justify-end pt-2">
                      <div className="bg-blue-50/40 border border-blue-200 rounded-xl px-5 py-3 text-right w-44">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Grand Total</span>
                        <span className="block text-xl font-bold text-blue-700 font-mono mt-0.5">BDT {grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleAccordion("note")}
                  className="p-4.5 flex items-center justify-between bg-white cursor-pointer select-none group border-b border-gray-50"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Add Note</h3>
                  <span className="text-gray-400 group-hover:text-gray-600">
                    {openSections.note ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {openSections.note && (
                  <div className="p-5 bg-white animate-slideDown">
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Order Note</label>
                    <textarea 
                      rows={4} 
                      value={formOrderNote}
                      onChange={(e) => setFormOrderNote(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:border-purple-600 outline-none bg-white text-gray-700 resize-none" 
                      placeholder="Write any specific instruction or delivery note..." 
                    />
                  </div>
                )}
              </div>

            </div>

            <div className="space-y-6 overflow-visible">
              
              <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleAccordion("info")}
                  className="p-4.5 flex items-center justify-between bg-white cursor-pointer select-none group border-b border-gray-50"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Order Information</h3>
                  <span className="text-gray-400 group-hover:text-gray-600">
                    {openSections.info ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {openSections.info && (
                  <div className="p-5 bg-white animate-slideDown space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Order Type</label>
                      <div className="flex bg-gray-100/70 p-1 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 select-none">
                        <button 
                          type="button" 
                          onClick={() => setFormOrderType("In shop")}
                          className={`flex-1 py-2 rounded-lg text-center flex items-center justify-center gap-1.5 transition-all ${
                            formOrderType === "In shop" ? "bg-white text-gray-900 shadow-3xs" : "hover:text-gray-800"
                          }`}
                        >
                          <ShoppingBag size={13} /> In shop
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormOrderType("Online")}
                          className={`flex-1 py-2 rounded-lg text-center flex items-center justify-center gap-1.5 transition-all ${
                            formOrderType === "Online" ? "bg-white text-gray-900 shadow-3xs" : "hover:text-gray-800"
                          }`}
                        >
                          <ExternalLink size={13} /> Online
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Order Status</label>
                      <div className="relative">
                        <select 
                          value={formOrderStatus}
                          onChange={(e) => setFormOrderStatus(e.target.value as Order["deliveryStatus"])}
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 appearance-none outline-none focus:border-purple-600 cursor-pointer"
                        >
                          <option value="Placed">Placed</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Returned">Returned</option>
                        </select>
                        <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400"><ChevronDown size={14} /></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleAccordion("customer")}
                  className="p-4.5 flex items-center justify-between bg-white cursor-pointer select-none group border-b border-gray-50"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Customer Information</h3>
                  <span className="text-gray-400 group-hover:text-gray-600">
                    {openSections.customer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {openSections.customer && (
                  <div className="p-5 bg-white animate-slideDown space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer Name</label>
                      <div className="relative flex items-center">
                        <User size={15} className="absolute left-3.5 text-gray-400" />
                        <input 
                          type="text" 
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Enter customer name" 
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 outline-none" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer Email</label>
                      <div className="relative flex items-center">
                        <Mail size={15} className="absolute left-3.5 text-gray-400" />
                        <input 
                          type="email" 
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="Enter customer email" 
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 outline-none" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer Phone</label>
                      <div className="relative flex items-center">
                        <Phone size={15} className="absolute left-3.5 text-gray-400" />
                        <input 
                          type="text" 
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Enter customer phone" 
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 outline-none" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer Address</label>
                      <div className="relative flex items-center">
                        <MapPin size={15} className="absolute left-3.5 text-gray-400" />
                        <input 
                          type="text" 
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="Enter customer address" 
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 outline-none" 
                        />
                      </div>
                    </div>

                    <div className="bg-[#f8f9fa] border border-gray-100 p-4 rounded-xl space-y-3 shadow-3xs mt-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                        <ShieldCheck size={16} className="text-indigo-600" />
                        <span>Customer Validity</span>
                      </div>
                      <button 
                        type="button" 
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <ShieldCheck size={14} /> Check Customer Validity
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-2">
                      <div>
                        <span className="text-xs font-bold text-gray-700 block">Mark as fraud?</span>
                        <span className="text-[10px] text-gray-400 font-medium block mt-0.5">Flag this customer based on behavior</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setFormMarkAsFraud(!formMarkAsFraud)}
                        className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 cursor-pointer ${
                          formMarkAsFraud ? "bg-red-500" : "bg-slate-300"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 shadow-3xs transition-all duration-200 ${
                          formMarkAsFraud ? "right-0.5" : "left-0.5"
                        }`} />
                      </button>
                    </div>

                  </div>
                )}
              </div>

            </div>
            
          </div>
        </div>
      )}

      {/* ==================== SCREEN 3: FIXED MODAL CONTAINER FRAME WITH ROBUST FILTERS ==================== */}
      {showProductModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowProductModal(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-gray-100 shadow-2xl p-6 relative overflow-visible animate-scaleUp" onClick={(e) => e.stopPropagation()}>
            
            {/* Corner absolute close button correctly layered */}
            <button 
              type="button" 
              onClick={() => setShowProductModal(false)} 
              className="absolute -top-3 -right-3 p-2 bg-white border border-gray-100 text-gray-500 hover:text-gray-700 rounded-full shadow-md z-50 cursor-pointer transition-transform hover:scale-105"
            >
              <X size={18} />
            </button>

            {orderLineItems.length > 0 && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 mb-4">
                <span className="text-xs font-bold text-emerald-700">
                  {orderLineItems.reduce((sum, l) => sum + l.qty, 0)} item(s) added • ৳{productsSubtotal.toFixed(2)}
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowProductModal(false)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full mt-2">
              <div className="relative flex items-center bg-white border border-gray-200 rounded-xl shadow-3xs overflow-hidden flex-1 w-full">
                <Search size={16} className="absolute left-3.5 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Items..." 
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-medium bg-white text-gray-700 outline-none" 
                />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex items-center bg-white border border-gray-200 rounded-xl shadow-3xs overflow-hidden">
                  <select
                    value={selectedModalCategory}
                    onChange={(e) => setSelectedModalCategory(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-2.5 text-xs font-bold text-gray-600 bg-white outline-none cursor-pointer"
                  >
                    {modalCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 pointer-events-none text-gray-400"><ChevronDown size={14} /></div>
                </div>
                <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer tracking-wide whitespace-nowrap">
                  <Plus size={14} /> Add Product
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mt-5 overflow-x-auto">
              {modalCategories.map((cat) => (
                <button 
                  key={cat} 
                  type="button" 
                  onClick={() => setSelectedModalCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                    selectedModalCategory === cat 
                      ? "bg-purple-50 border-purple-300 text-purple-700 shadow-3xs" 
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mt-6 max-h-90 overflow-y-auto pr-1">
              {filteredModalProducts.length > 0 ? (
                filteredModalProducts.map((product) => (
                  <div key={product._id} className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col justify-between shadow-3xs gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden shadow-3xs shrink-0 flex items-center justify-center text-gray-300">
                        {product.images && product.images[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={24} />
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <h5 className="font-bold text-gray-900 text-xs leading-relaxed line-clamp-2">{product.title}</h5>
                        <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-gray-400">
                          <span>Stock: <span className="text-gray-600 font-mono">{product.stock}</span></span>
                          <span>Price: <span className="text-gray-600 font-mono">{product.price} BDT</span></span>
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleAddProductToOrder(product)}
                      className={`w-full py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors ${
                        lastAddedProductId === product._id
                          ? "bg-emerald-500 text-white"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      }`}
                    >
                      {lastAddedProductId === product._id ? (
                        <>
                          <Check size={13} /> Added
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={13} /> Add to Receipt
                        </>
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-10 text-xs font-bold text-gray-400">
                  No real store products match the specified query filters. Go to Products tab to insert data items.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrderDetails(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900 text-[15px]">Order Invoice Elements</h3>
                <p className="text-xs font-mono text-indigo-600 mt-0.5">ID: #{selectedOrderDetails.orderId}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrderDetails(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 text-sm text-gray-600 overflow-y-auto">
              <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipient Details</p>
                <p className="font-semibold text-gray-900">{selectedOrderDetails.customerName}</p>
                <p className="text-xs font-mono">{selectedOrderDetails.customerPhone}</p>
                <p className="text-xs">{selectedOrderDetails.customerAddress}</p>
              </div>

              {/* ==================================================== */}
              {/* REAL-TIME ORDER STATUS TIMELINE                       */}
              {/* ==================================================== */}
              {(() => {
                const { steps, isLegacy } = buildTimelineSteps(selectedOrderDetails);
                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <History size={13} className="text-indigo-500" /> Order Timeline
                      </p>
                      {isLegacy && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Partial history
                        </span>
                      )}
                    </div>

                    <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4">
                      <div className="relative">
                        {steps.map((step, idx) => {
                          const colors = getStatusTimelineColor(step.status);
                          const isLast = idx === steps.length - 1;
                          const isTerminal = TERMINAL_STATUSES.includes(step.status);
                          return (
                            <div key={idx} className="flex gap-3 relative">
                              {/* Connector line */}
                              {!isLast && (
                                <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-gray-200" />
                              )}
                              {/* Dot */}
                              <div className={`relative z-10 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white ${colors.dot} ring-4 ${colors.ring}`}>
                                {getStatusTimelineIcon(step.status)}
                              </div>
                              {/* Content */}
                              <div className={`flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-xs font-black ${colors.text}`}>
                                    {step.status}
                                    {isTerminal && (
                                      <span className="ml-1.5 text-[9px] font-bold text-gray-400 uppercase">(Final)</span>
                                    )}
                                  </span>
                                  {isLast && !isLegacy && (
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                                  {formatTimelineDate(step.changedAt)} • {formatTimelineTime(step.changedAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })}

                        {/* Legacy notice: explain the gap between Placed and current status */}
                        {isLegacy && selectedOrderDetails.deliveryStatus !== "Placed" && (
                          <div className="flex gap-3 relative mt-1">
                            <div className="relative z-10 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 bg-gray-100 ring-4 ring-gray-50 border border-dashed border-gray-300">
                              <CircleDot size={12} />
                            </div>
                            <div className="flex-1 pt-0.5">
                              <span className="text-[11px] font-semibold text-gray-400 italic">
                                Intermediate steps not tracked for this order
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Purchased Items</p>
                {selectedOrderDetails.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between border-b border-gray-50 pb-2 text-xs font-medium">
                    <div className="max-w-xs"><p className="text-gray-800 font-medium">{item.name}</p><p className="text-gray-400 mt-0.5">Qty: {item.qty} x ৳{item.unitPrice}</p></div>
                    <span className="font-semibold text-gray-900">৳{(item.qty * item.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 text-xs font-semibold space-y-1.5 text-gray-500 border-t border-gray-100">
                <div className="flex justify-between"><span>Delivery Charge</span><span>৳{selectedOrderDetails.deliveryCharge.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1"><span>Net Total Amount</span><span>৳{selectedOrderDetails.totalAmount.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}