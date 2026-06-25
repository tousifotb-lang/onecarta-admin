"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Search, SlidersHorizontal, Eye, MoreVertical, 
  ShoppingCart, X, Save, Image as ImageIcon, 
  Video, Percent, Package, Truck, Layers, Info, Loader2,
  Bold, Italic, Underline, Quote, List, ListOrdered, 
  Link2, AlignLeft, AlignCenter, AlignRight, Type, Trash2,
  ChevronUp, ChevronDown, Edit3, Copy, GripVertical, ExternalLink, ArrowUpDown,
  CheckCircle2, XCircle, AlertTriangle
} from "lucide-react";

interface Category {
  _id: string;
  name: string;
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
}

interface VariantOption {
  attribute: string;
  extraPrice: string;
}

interface ProductVariant {
  id: string;
  mandatory: boolean;
  title: string;
  options: VariantOption[];
}

interface SpecificationField {
  id: string;
  detailType: string;
  detailDescription: string;
}

type ToastState = { message: string; type: "success" | "error" } | null;

export default function PremiumProductManager() {
  const [view, setView] = useState<"list" | "add">("list");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState("All products");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [qtySortOrder, setQtySortOrder] = useState<"asc" | "desc" | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Multi-select / bulk action states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null); // ids pending delete confirmation
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Pagination and Row Count Limit States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Form Field States
  const [title, setTitle] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState(""); 
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [productSerial, setProductSerial] = useState("0");
  const [sku, setSku] = useState("");
  const [unitName, setUnitName] = useState("");
  const [stock, setStock] = useState("");
  const [warranty, setWarranty] = useState("");
  const [initialSold, setInitialSold] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [condition, setCondition] = useState("New");
  const [status, setStatus] = useState("ACTIVE");

  // Shipping States
  const [applyDefaultShipping, setApplyDefaultShipping] = useState(true);
  const [shippingDefaultCharge, setShippingDefaultCharge] = useState("0");
  const [shippingInsideDhaka, setShippingInsideDhaka] = useState("80");
  const [shippingOutsideDhaka, setShippingOutsideDhaka] = useState("130");

  // Dynamic States Engine
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [specifications, setSpecifications] = useState<SpecificationField[]>([]);

  // Accordion Collapse States
  const [openSections, setOpenSections] = useState({
    generalInfo: true,
    media: true,
    pricing: true,
    inventory: true,
    shipping: true,
    variants: true,
    details: true,
    category: true,
    brand: true,
    dimensions: true,
    condition: true,
    status: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Rich Text Editor Command
  const handleEditorCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setDescription(editorRef.current.innerHTML);
    }
  };

  // Image & Video URL Prompts
  const promptImageUrl = () => {
    const url = prompt("Enter Image URL Address:", imageUrl);
    if (url !== null) setImageUrl(url.trim());
  };

  const promptVideoUrl = () => {
    const url = prompt("Enter Video URL Link:", videoUrl);
    if (url !== null) setVideoUrl(url.trim());
  };

  // Variant Methods
  const addNewVariantCard = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setVariants([...variants, { id: newId, mandatory: true, title: "", options: [{ attribute: "", extraPrice: "" }] }]);
  };

  const removeVariantCard = (vId: string) => {
    setVariants(variants.filter(v => v.id !== vId));
  };

  const updateVariantHeader = (vId: string, field: "title" | "mandatory", value: any) => {
    setVariants(variants.map(v => v.id === vId ? { ...v, [field]: value } : v));
  };

  const addMoreOptionRow = (vId: string) => {
    setVariants(variants.map(v => v.id === vId ? { ...v, options: [...v.options, { attribute: "", extraPrice: "" }] } : v));
  };

  const removeOptionRow = (vId: string, optIndex: number) => {
    setVariants(variants.map(v => v.id === vId ? { ...v, options: v.options.filter((_, idx) => idx !== optIndex) } : v));
  };

  const updateOptionInput = (vId: string, optIndex: number, field: "attribute" | "extraPrice", value: string) => {
    setVariants(variants.map(v => {
      if (v.id === vId) {
        const updatedOptions = v.options.map((opt, idx) => optIndex === idx ? { ...opt, [field]: value } : opt);
        return { ...v, options: updatedOptions };
      }
      return v;
    }));
  };

  // Product Details Methods
  const addNewSpecField = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setSpecifications([...specifications, { id: newId, detailType: "", detailDescription: "" }]);
  };

  const removeSpecField = (sId: string) => {
    setSpecifications(specifications.filter(s => s.id !== sId));
  };

  const updateSpecInput = (sId: string, field: "detailType" | "detailDescription", value: string) => {
    setSpecifications(specifications.map(s => s.id === sId ? { ...s, [field]: value } : s));
  };

  // Sliced Paginated Product Calculation Logic
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [itemsPerPage, totalPages, currentPage]);

  // Global Drag and Drop Offset Re-indexing Handler
  const handleDragStart = (idx: number) => {
    setDraggedIdx(indexOfFirstProduct + idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIdx: number) => {
    const globalTargetIdx = indexOfFirstProduct + targetIdx;
    if (draggedIdx === null || draggedIdx === globalTargetIdx) return;
    const reorderedList = [...products];
    const [removedItem] = reorderedList.splice(draggedIdx, 1);
    reorderedList.splice(globalTargetIdx, 0, removedItem);
    setProducts(reorderedList);
    setDraggedIdx(null);
  };

  // Quantity Toggle Sort Filter Implementation
  const handleQuantitySort = () => {
    let nextOrder: "asc" | "desc" | null = "asc";
    if (qtySortOrder === "asc") nextOrder = "desc";
    else if (qtySortOrder === "desc") nextOrder = null;

    setQtySortOrder(nextOrder);

    if (nextOrder === null) {
      setView("list");
    } else {
      const sorted = [...products].sort((a, b) => {
        return nextOrder === "asc" ? a.stock - b.stock : b.stock - a.stock;
      });
      setProducts(sorted);
    }
  };

  // ---------- Selection helpers ----------
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allCurrentSelected =
    currentProducts.length > 0 && currentProducts.every((p) => selectedIds.has(p._id));

  const toggleSelectAllCurrentPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allCurrentSelected) {
        currentProducts.forEach((p) => next.delete(p._id));
      } else {
        currentProducts.forEach((p) => next.add(p._id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ---------- Delete flow (single or bulk) ----------
  const requestDelete = (ids: string[]) => setDeleteTarget(ids);

  const executeDelete = async () => {
    if (!deleteTarget || deleteTarget.length === 0) return;
    setIsDeleting(true);
    try {
      let res: Response;
      if (deleteTarget.length === 1) {
        res = await fetch(`/api/products?id=${deleteTarget[0]}`, { method: "DELETE" });
      } else {
        res = await fetch("/api/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: deleteTarget }),
        });
      }

      if (res.ok) {
        const deletedSet = new Set(deleteTarget);
        setProducts((prev) => prev.filter((p) => !deletedSet.has(p._id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deletedSet.forEach((id) => next.delete(id));
          return next;
        });
        setToast({
          message: deleteTarget.length > 1 ? `${deleteTarget.length} products deleted` : "Product deleted",
          type: "success",
        });
      } else {
        const data = await res.json().catch(() => ({} as any));
        setToast({ message: data.error || "Failed to delete product(s)", type: "error" });
      }
    } catch (err) {
      setToast({ message: "A server error occurred while deleting", type: "error" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ---------- Bulk status update ----------
  const bulkUpdateStatus = async (newStatus: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, updates: { status: newStatus } }),
      });

      if (res.ok) {
        setToast({ message: `${ids.length} product(s) set to ${newStatus}`, type: "success" });
        clearSelection();
      } else {
        const data = await res.json().catch(() => ({} as any));
        setToast({ message: data.error || "Failed to update products", type: "error" });
      }
    } catch (err) {
      setToast({ message: "A server error occurred while updating", type: "error" });
    }
  };

  const handleEditProduct = (prod: Product) => {
    setTitle(prod.title);
    setPrice(prod.price.toString());
    setDiscountPrice(prod.discountPrice ? prod.discountPrice.toString() : "");
    setStock(prod.stock.toString());
    setSku(prod.sku || "");
    setImageUrl(prod.images && prod.images[0] ? prod.images[0] : "");
    setView("add");
  };

  // Fetch Data
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories")
        ]);
        const prodData = await prodRes.json();
        const catData = await catRes.json();

        if (prodRes.ok) setProducts(prodData);
        if (catRes.ok) setCategories(catData);
      } catch (err) {
        setError("Operational error connecting with MongoDB central server");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          price: Number(price),
          discountPrice: discountPrice ? Number(discountPrice) : null,
          description: description || shortDesc,
          stock: Number(stock) || 0,
          categoryId,
          images: imageUrl ? [imageUrl.trim()] : [],
          sku: sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
          shipping: {
            applyDefault: applyDefaultShipping,
            defaultCharge: Number(shippingDefaultCharge),
            insideDhaka: Number(shippingInsideDhaka),
            outsideDhaka: Number(shippingOutsideDhaka)
          },
          variants,
          specifications
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setProducts([data, ...products]);
        setTitle(""); setShortDesc(""); setDescription(""); setImageUrl(""); setVideoUrl("");
        setPrice(""); setDiscountPrice(""); setBuyingPrice(""); setProductSerial("0");
        setSku(""); setUnitName(""); setStock(""); setWarranty(""); setInitialSold("0");
        setCategoryId(""); setBrand(""); setWeight(""); setLength(""); setWidth(""); setHeight("");
        setApplyDefaultShipping(true); setShippingDefaultCharge("0"); setShippingInsideDhaka("80"); setShippingOutsideDhaka("130");
        setVariants([]); setSpecifications([]);
        setView("list");
        setToast({ message: "Product created", type: "success" });
      } else {
        setError(data.error || "Failed to upload product");
        setToast({ message: data.error || "Failed to upload product", type: "error" });
      }
    } catch (err) {
      setError("An operational server error occurred");
      setToast({ message: "An operational server error occurred", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center gap-2 font-semibold text-gray-500 text-sm tracking-wider uppercase">
        <Loader2 size={18} className="animate-spin text-indigo-600" /> Syncing OneCarta Inventory Matrix...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans selection:bg-indigo-100 p-4 sm:p-6 lg:p-8">
      
      {/* ==================== VIEW 1: PRODUCT LIST VIEW ==================== */}
      {view === "list" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">All Products</h1>
              <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{products.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 shadow-2xs"><Search size={18} /></button>
              <button type="button" onClick={() => setView("add")} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"><Plus size={18} /> Add Product</button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
            <div className="flex items-center gap-2.5">
              {["All products", "Beauty & Care", "Electronics", "Fashion", "Bags & Luggage"].map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${activeTab === tab ? "bg-white border-indigo-600 text-indigo-600 shadow-xs" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>{tab}</button>
              ))}
            </div>
            <button type="button" className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 flex items-center gap-2 hover:bg-gray-50 shadow-2xs"><SlidersHorizontal size={16} /> Show All</button>
          </div>

          {/* ==================== BULK ACTION BAR ==================== */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-600 text-white rounded-xl px-5 py-3 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3 text-sm font-medium">
                <span>{selectedIds.size} selected</span>
                <button type="button" onClick={clearSelection} className="text-indigo-200 hover:text-white underline text-xs cursor-pointer">
                  Clear
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bulkUpdateStatus("ACTIVE")}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Set Active
                </button>
                <button
                  type="button"
                  onClick={() => bulkUpdateStatus("DRAFT")}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Set Draft
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(Array.from(selectedIds))}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} /> Delete Selected
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-visible">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 text-gray-400 uppercase tracking-wider border-b border-gray-100 text-xs font-semibold select-none">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allCurrentSelected}
                        onChange={toggleSelectAllCurrentPage}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Select all on this page"
                      />
                    </th>
                    <th className="p-4 w-10 text-center"></th>
                    <th className="p-4">Product</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">SKU</th>
                    <th className="p-4">Price</th>
                    
                    {/* Interactive Clickable Quantity Filter Column Header */}
                    <th 
                      className="p-4 cursor-pointer hover:text-indigo-600 transition-colors items-center gap-1.5"
                      onClick={handleQuantitySort}
                    >
                      <div className="flex items-center gap-1">
                        <span>Qty</span>
                        <ArrowUpDown size={13} className={qtySortOrder ? "text-indigo-600" : "text-gray-300"} />
                      </div>
                    </th>
                    
                    <th className="p-4 w-24 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {currentProducts.map((prod, idx) => (
                    <tr 
                      key={prod._id} 
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(idx)}
                      className={`hover:bg-gray-50/40 transition-all group ${
                        draggedIdx === indexOfFirstProduct + idx ? "opacity-40 bg-gray-100" : ""
                      } ${selectedIds.has(prod._id) ? "bg-indigo-50/40" : ""}`}
                    >

                      {/* Row select checkbox */}
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(prod._id)}
                          onChange={() => toggleSelectOne(prod._id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      
                      {/* Workable Drag Grip Controller column */}
                      <td className="p-4 text-center text-gray-300 cursor-move" title="Drag row to reorder up/down">
                        <GripVertical size={16} className="inline-block text-gray-400 hover:text-gray-600 transition-colors" />
                      </td>

                      <td className="p-4 flex items-center gap-3.5">
                        <div className="w-11 h-12 border border-gray-100 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-2xs">
                          {prod.images && prod.images[0] ? <img src={prod.images[0]} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-300" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm block group-hover:text-indigo-600 transition-colors">{prod.title}</span>
                          <a 
                            href={`/products/${prod.slug}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-indigo-600 transition-colors p-0.5 rounded"
                            onClick={(e) => e.stopPropagation()}
                            title="View Product Link"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                      <td className="p-4 text-gray-400 font-medium">Own</td>
                      <td className="p-4 font-mono text-gray-500 text-xs">{prod.sku || "N/A"}</td>
                      <td className="p-4 font-semibold text-gray-900">৳{prod.price.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium border ${
                          prod.stock > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                        }`}>
                          {prod.stock}
                        </span>
                      </td>
                      
                      {/* Clean Aligned Action Column Box (Without Extra Add Button) */}
                      <td className="p-4 text-center relative overflow-visible pr-6">
                        <div className="relative inline-block overflow-visible">
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === prod._id ? null : prod._id);
                            }}
                            className={`p-2 border rounded-xl transition-all shadow-2xs bg-white text-gray-500 cursor-pointer hover:text-indigo-600 ${
                              activeMenuId === prod._id ? "border-purple-600 ring-2 ring-purple-100 text-purple-600" : "border-gray-200"
                            }`}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeMenuId === prod._id && (
                            <div className="absolute right-0 mt-1.5 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1.5 text-left animate-fadeIn">
                              <button 
                                type="button"
                                onClick={() => handleEditProduct(prod)}
                                className="w-full px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Eye size={14} className="text-gray-400" /> View
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleEditProduct(prod)}
                                className="w-full px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Edit3 size={14} className="text-gray-400" /> Edit
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  setTitle(`${prod.title} (Clone)`);
                                  setPrice(prod.price.toString());
                                  setStock(prod.stock.toString());
                                  setView("add");
                                }}
                                className="w-full px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Copy size={14} className="text-gray-400" /> Clone product
                              </button>
                              <div className="border-t border-gray-50 my-1"></div>
                              <button 
                                type="button"
                                onClick={() => requestDelete([prod._id])}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Trash2 size={14} className="text-red-400" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==================== WORKABLE PAGINATION CONTROL FOOTER (SCREENSHOT COMPLIANT) ==================== */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 px-2 text-xs text-gray-500 font-medium select-none">
            {/* Left Box: Active Rows Slicer Select Panel */}
            <div className="flex items-center gap-2">
              <span>
                Showing {totalItems > 0 ? indexOfFirstProduct + 1 : 0}–{Math.min(indexOfLastProduct, totalItems)} of {totalItems}
              </span>
              <div className="relative inline-block">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none text-gray-700 cursor-pointer font-semibold transition-all"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
                  <ChevronDown size={14} />
                </div>
              </div>
              <span>per page</span>
            </div>

            {/* Right Box: Sequential Page Triggers */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 hover:text-indigo-600 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronUp className="-rotate-90" size={14} /> Previous
              </button>
              <span className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white font-semibold text-gray-700 text-center">
                {currentPage}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="flex items-center gap-1 hover:text-indigo-600 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Next <ChevronUp className="rotate-90" size={14} />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ==================== VIEW 2: ADD PRODUCT VIEW ==================== */}
      {view === "add" && (
        <form onSubmit={handleCreateProduct} className="space-y-5 max-w-7xl mx-auto">
          
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 bg-[#f8f9fa] sticky top-0 z-10">
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Add Product</h1>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setView("list")} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 text-sm font-medium rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"><X size={16} /> Discard</button>
              <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save</>}</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2 space-y-5">
              
              {/* 1. General Information */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleSection("generalInfo")}
                  className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">General Information</h3>
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    {openSections.generalInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {openSections.generalInfo && (
                  <div className="p-5 space-y-4 bg-white animate-slideDown">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Item Name <span className="text-red-500">*</span></label>
                      <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Item Name" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Short Description (SEO & Data Feed)</label>
                      <textarea rows={2} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="Short Description" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 bg-white resize-none" />
                      <span className="text-xs text-gray-400 block text-right font-mono mt-1">0/255</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product Description</label>
                      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                        <div className="bg-gray-50/90 border-b border-gray-200 px-3 py-1.5 flex items-center flex-wrap gap-1.5 text-gray-500 select-none">
                          <div className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-0.5 rounded-md text-xs font-medium text-gray-700 mr-1 shadow-3xs">
                            <span>Normal</span><span className="text-[8px] text-gray-400">▼</span>
                          </div>
                          <div className="w-px h-3.5 bg-gray-200 mx-1"></div>
                          <button type="button" onClick={() => handleEditorCommand("bold")} className="p-1 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"><Bold size={14} /></button>
                          <button type="button" onClick={() => handleEditorCommand("italic")} className="p-1 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"><Italic size={14} /></button>
                          <button type="button" onClick={() => handleEditorCommand("underline")} className="p-1 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"><Underline size={14} /></button>
                          <button type="button" onClick={() => handleEditorCommand("formatBlock", "blockquote")} className="p-1 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"><Quote size={14} /></button>
                          <div className="w-px h-3.5 bg-gray-200 mx-1"></div>
                          <button type="button" onClick={() => handleEditorCommand("foreColor", "#7c3aed")} className="p-1 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"><Type size={14} /></button>
                          <div className="w-px h-3.5 bg-gray-200 mx-1"></div>
                          <button type="button" onClick={() => handleEditorCommand("insertUnorderedList")} className="p-1 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"><List size={14} /></button>
                          <button type="button" onClick={() => handleEditorCommand("insertOrderedList")} className="p-1 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"><ListOrdered size={14} /></button>
                          <div className="w-px h-3.5 bg-gray-200 mx-1"></div>
                          <button type="button" onClick={() => handleEditorCommand("justifyLeft")} className="p-1 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"><AlignLeft size={14} /></button>
                          <button type="button" onClick={() => { const url = prompt("Enter link URL:"); if (url) handleEditorCommand("createLink", url); }} className="p-1 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"><Link2 size={14} /></button>
                          <button type="button" onClick={() => { const src = prompt("Enter image URL:"); if (src) handleEditorCommand("insertImage", src); }} className="p-1 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"><ImageIcon size={14} /></button>
                          <button type="button" onClick={() => handleEditorCommand("removeFormat")} className="p-1 text-red-500 rounded-lg hover:bg-red-50 transition-colors">Tₓ</button>
                        </div>
                        <div 
                          ref={editorRef} 
                          contentEditable 
                          onInput={(e) => setDescription(e.currentTarget.innerHTML)} 
                          className={`w-full min-h-36 px-3.5 py-2.5 bg-white text-sm focus:outline-hidden prose max-w-none font-medium font-sans text-gray-800 relative ${
                            !description ? "before:content-['Write_something...'] before:absolute before:text-gray-400 before:pointer-events-none" : ""
                          }`}
                          style={{ outline: "none" }} 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Media */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleSection("media")}
                  className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Media</h3>
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    {openSections.media ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </div>

                {openSections.media && (
                  <div className="p-6 space-y-5 bg-white animate-slideDown">
                    <div className="border-2 border-dashed border-gray-200 hover:border-[#7c3aed] bg-white hover:bg-[#fbfbfe] rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2.5 transition-all duration-300 min-h-36 group/img">
                      <div className="text-gray-400 group-hover/img:text-[#7c3aed] transition-colors duration-300"><ImageIcon size={28} strokeWidth={1.5} /></div>
                      <p className="text-sm font-medium text-gray-400 max-w-xl leading-relaxed group-hover/img:text-gray-500 transition-colors duration-300">Drag and drop image here, or click add image. Supported formats: JPG, PNG, Max size: 4MB.</p>
                      <button type="button" onClick={promptImageUrl} className="mt-1 px-4 py-1.5 bg-[#f3f0ff] hover:bg-[#e4defc] text-[#7c3aed] font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-3xs">Add Image</button>
                      {imageUrl && <p className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md mt-1 truncate max-w-md">✓ {imageUrl}</p>}
                    </div>

                    <div className="border border-dashed border-gray-200 hover:border-[#7c3aed] bg-white hover:bg-[#fbfbfe] rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2.5 transition-all duration-300 min-h-32 group/vid">
                      <div className="text-gray-400 group-hover/vid:text-[#7c3aed] transition-colors duration-300"><Video size={26} strokeWidth={1.5} /></div>
                      <p className="text-xs font-medium text-gray-400 tracking-tight group-hover/vid:text-gray-500 transition-colors duration-300">Paste the video link here</p>
                      <button type="button" onClick={promptVideoUrl} className="px-4 py-1.5 bg-[#f3f0ff] hover:bg-[#e4defc] text-[#7c3aed] font-medium text-xs rounded-xl transition-colors cursor-pointer shadow-3xs">Add Link</button>
                      {videoUrl && <p className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md mt-1 truncate max-w-md">✓ {videoUrl}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Pricing */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleSection("pricing")}
                  className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Pricing</h3>
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    {openSections.pricing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {openSections.pricing && (
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white animate-slideDown">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sell/Current Price <span className="text-red-500">*</span></label>
                      <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Regular/Old Price</label>
                      <input type="number" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} placeholder="0" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Buying Price (Optional)</label>
                      <input type="number" value={buyingPrice} onChange={(e) => setBuyingPrice(e.target.value)} placeholder="0" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-800" />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Inventory */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleSection("inventory")}
                  className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Inventory</h3>
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    {openSections.inventory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {openSections.inventory && (
                  <div className="p-5 space-y-4 bg-white animate-slideDown">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Product Serial</label>
                        <input type="text" value={productSerial} onChange={(e) => setProductSerial(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white font-mono text-gray-800" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">SKU / Product Code</label>
                        <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white font-mono text-gray-800" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Unit Name</label>
                        <input type="text" value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="e.g., kg, ml" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-800" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Quantity (Stock)</label>
                        <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white font-mono text-gray-800" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Warranty</label>
                        <input type="text" value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="Warranty" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-800" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Initial Sold Count</label>
                        <input type="number" value={initialSold} onChange={(e) => setInitialSold(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white font-mono text-gray-800" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Shipping */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleSection("shipping")}
                  className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Shipping</h3>
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    {openSections.shipping ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </div>

                {openSections.shipping && (
                  <div className="p-5 space-y-4 bg-white animate-slideDown">
                    <div>
                      <p className="text-gray-800 font-semibold text-[15px]">Delivery Charge</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">You can add specific delivery charge for this product or use the default charges</p>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                      <span className="text-sm font-medium text-gray-700">Apply default delivery charges</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400">{applyDefaultShipping ? "Applied" : "Not Applied"}</span>
                        <button type="button" onClick={() => setApplyDefaultShipping(!applyDefaultShipping)} className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 cursor-pointer ${applyDefaultShipping ? "bg-indigo-600" : "bg-slate-700"}`}><span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 shadow-xs transition-all duration-200 ${applyDefaultShipping ? "right-0.5" : "left-0.5"}`} /></button>
                      </div>
                    </div>
                    {!applyDefaultShipping && (
                      <div className="space-y-4 animate-fadeIn">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Delivery Charge (Default)</label>
                          <input type="number" value={shippingDefaultCharge} onChange={(e) => setShippingDefaultCharge(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-800" />
                          <p className="text-xs text-gray-400 font-medium mt-1">Default delivery charge will be applied to all areas, except for the specific zones listed below.</p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Specific Delivery Charges</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 flex items-center">Inside Dhaka</div>
                            <input type="number" value={shippingInsideDhaka} onChange={(e) => setShippingInsideDhaka(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-center text-gray-800" />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 flex items-center">Outside Dhaka</div>
                            <input type="number" value={shippingOutsideDhaka} onChange={(e) => setShippingOutsideDhaka(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-center text-gray-800" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 6. Product Variants */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleSection("variants")}
                  className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Product Variants</h3>
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    {openSections.variants ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {openSections.variants && (
                  <div className="p-5 space-y-4 bg-white animate-slideDown">
                    <p className="text-xs text-gray-400 font-semibold mb-1.5">You can add multiple variant for a single product here. Like Size, Color, and Weight etc.</p>
                    <div className="space-y-4">
                      {variants.map((variant) => (
                        <div key={variant.id} className="border border-indigo-100 bg-white rounded-2xl p-5 space-y-4 relative shadow-3xs">
                          <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
                            <span className="text-sm font-medium text-gray-700">Make this variant mandatory</span>
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-semibold text-gray-400 uppercase">{variant.mandatory ? "YES" : "NO"}</span>
                              <button type="button" onClick={() => updateVariantHeader(variant.id, "mandatory", !variant.mandatory)} className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 cursor-pointer ${variant.mandatory ? "bg-indigo-600" : "bg-slate-300"}`}><span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 shadow-xs transition-all duration-200 ${variant.mandatory ? "right-0.5" : "left-0.5"}`} /></button>
                              <button type="button" onClick={() => removeVariantCard(variant.id)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors ml-1"><Trash2 size={15} /></button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title</label>
                            <input type="text" required value={variant.title} onChange={(e) => updateVariantHeader(variant.id, "title", e.target.value)} placeholder="Enter the name of the variant (e.g., Color, Size)" className="w-full px-3.5 py-2.5 border border-gray-200 focus:border-[#7c3aed] rounded-xl text-sm font-medium bg-white text-gray-700 outline-hidden font-sans" />
                          </div>
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-400"><span>Attribute</span><span>Extra Price</span></div>
                            {variant.options.map((option, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2.5 w-full">
                                <div className="grid grid-cols-2 gap-3 flex-1">
                                  <input type="text" required value={option.attribute} onChange={(e) => updateOptionInput(variant.id, optIdx, "attribute", e.target.value)} placeholder="Enter variant option" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 font-sans" />
                                  <input type="number" value={option.extraPrice} onChange={(e) => updateOptionInput(variant.id, optIdx, "extraPrice", e.target.value)} placeholder="Enter extra price" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700" />
                                </div>
                                {variant.options.length > 1 && <button type="button" onClick={() => removeOptionRow(variant.id, optIdx)} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-colors font-medium">✕</button>}
                              </div>
                            ))}
                            <button type="button" onClick={() => addMoreOptionRow(variant.id)} className="mt-1.5 px-3.5 py-2 bg-[#f3f0ff] hover:bg-[#e4defc] text-[#7c3aed] font-medium text-xs rounded-xl transition-colors cursor-pointer">Add More Option+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addNewVariantCard} className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium text-xs rounded-xl cursor-pointer transition-colors">+ Add a new variant</button>
                  </div>
                )}
              </div>

              {/* 7. Product Details */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div 
                  onClick={() => toggleSection("details")}
                  className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group"
                >
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Product Details</h3>
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    {openSections.details ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </div>

                {openSections.details && (
                  <div className="p-6 space-y-4 bg-white animate-slideDown">
                    <p className="text-xs text-gray-400 font-medium mb-1.5">You can add multiple product details for a single product here. Like Brand, Model, Serial Number, Fabric Type, and EMI etc.</p>
                    <div className="space-y-3.5">
                      {specifications.map((spec) => (
                        <div key={spec.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end relative group">
                          <div>
                            {specifications[0]?.id === spec.id && <label className="block text-xs font-semibold text-gray-500 mb-1.5">Detail Type</label>}
                            <input type="text" required value={spec.detailType} onChange={(e) => updateSpecInput(spec.id, "detailType", e.target.value)} placeholder="e.g., Brand, Material" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 outline-hidden font-sans" />
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1">
                              {specifications[0]?.id === spec.id && <label className="block text-xs font-semibold text-gray-500 mb-1.5">Detail Description</label>}
                              <input type="text" required value={spec.detailDescription} onChange={(e) => updateSpecInput(spec.id, "detailDescription", e.target.value)} placeholder="e.g., Samsung, 100% Cotton" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 font-sans" />
                            </div>
                            <button type="button" onClick={() => removeSpecField(spec.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-colors font-medium">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addNewSpecField} className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium text-xs rounded-xl cursor-pointer transition-colors mt-1.5">+ Add a new field</button>
                  </div>
                )}
              </div>

            </div>

            {/* ==================== RIGHT SIDEBAR PANEL ==================== */}
            <div className="space-y-5">
              
              {/* Category Assignment */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div onClick={() => toggleSection("category")} className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group">
                  <h4 className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">Category</h4>
                  <span className="text-gray-400">{openSections.category ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </div>
                {openSections.category && (
                  <div className="p-4.5 space-y-3.5 bg-white animate-slideDown">
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-2 focus:ring-indigo-100">
                      <option value="">Select Category</option>
                      {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                    </select>
                    <button type="button" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium uppercase tracking-wider transition-colors shadow-sm">Assign category</button>
                  </div>
                )}
              </div>

              {/* Brand SEO */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div onClick={() => toggleSection("brand")} className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group">
                  <h4 className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">Brand (SEO & Data Feed)</h4>
                  <span className="text-gray-400">{openSections.brand ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </div>
                {openSections.brand && (
                  <div className="p-4.5 bg-white animate-slideDown">
                    <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand Name" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-800" />
                  </div>
                )}
              </div>

              {/* Product Weight & Dimensions */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div onClick={() => toggleSection("dimensions")} className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group">
                  <h4 className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">Product Weight & Dimensions</h4>
                  <span className="text-gray-400">{openSections.dimensions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </div>
                {openSections.dimensions && (
                  <div className="p-4.5 space-y-3.5 bg-white animate-slideDown">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-1.5">Weight (kg)</label>
                      <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g., 1.5" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-800" />
                    </div>
                    <div className="space-y-1.5 pt-0.5">
                      <label className="block text-xs font-semibold text-gray-400 tracking-wider">Dimensions (cm)</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="text" value={length} onChange={(e) => setLength(e.target.value)} placeholder="L" className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm font-medium text-center bg-white text-gray-800" />
                        <input type="text" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="W" className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm font-medium text-center bg-white text-gray-800" />
                        <input type="text" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="H" className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm font-medium text-center bg-white text-gray-800" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Condition Dropdown */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div onClick={() => toggleSection("condition")} className="p-4.5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group">
                  <h4 className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">Condition (SEO)</h4>
                  <span className="text-gray-400">{openSections.condition ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </div>
                {openSections.condition && (
                  <div className="p-4.5 bg-white animate-slideDown">
                    <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700"><option value="New">New</option><option value="Used">Used</option></select>
                  </div>
                )}
              </div>

              {/* Product Status Dropdown */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
                <div onClick={() => toggleSection("status")} className="p-5 flex items-center justify-between border-b border-gray-50 bg-white cursor-pointer select-none group">
                  <h4 className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">Product Status</h4>
                  <span className="text-gray-400">{openSections.status ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </div>
                {openSections.status && (
                  <div className="p-4.5 bg-white animate-slideDown">
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700"><option value="ACTIVE">ACTIVE</option><option value="DRAFT">DRAFT</option></select>
                  </div>
                )}
              </div>

            </div>
          </div>
        </form>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 animate-fadeIn">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Delete {deleteTarget.length > 1 ? `${deleteTarget.length} products` : "this product"}?
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  This action cannot be undone. {deleteTarget.length > 1 ? "All selected products" : "This product"} will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TOAST NOTIFICATION ==================== */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2.5 animate-fadeIn ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
          <button type="button" onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}