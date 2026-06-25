// Place this file at: app/categories/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Plus, Eye, Edit2, Trash2, ChevronRight,
  X, Image as ImageIcon, ArrowLeft, GripVertical, Box, Loader2, Network
} from "lucide-react";

interface CategoryNode {
  _id: string;
  name: string;
  slug: string;
  image: string | null;
  bannerImage: string | null;
  shortDescription: string;
  parentId: string | null;
  subCategoryCount: number;
}

interface BreadcrumbNode {
  _id: string;
  name: string;
}

const MAX_DEPTH = 15;

export default function CategoryManagerMatrix() {
  const [currentList, setCurrentList]         = useState<CategoryNode[]>([]);
  const [isLoadingList, setIsLoadingList]     = useState(true);
  const [navigationPath, setNavigationPath]   = useState<BreadcrumbNode[]>([]);
  const [currentParent, setCurrentParent]     = useState<CategoryNode | null>(null);
  const [searchQuery, setSearchQuery]         = useState("");

  // Modal state
  const [showModal, setShowProductModal]      = useState(false);
  const [modalMode, setModalMode]             = useState<"create" | "edit">("create");
  const [modalCategoryName, setModalCategoryName] = useState("");
  const [modalDescription, setModalDescription]   = useState("");
  const [activeEditId, setActiveEditId]       = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [modalError, setModalError]           = useState("");
  const [modalBannerPreview, setModalBannerPreview] = useState<string | null>(null);
  const [modalImagePreview, setModalImagePreview]   = useState<string | null>(null);
  const [modalBannerFile, setModalBannerFile] = useState<string | null>(null);
  const [modalImageFile, setModalImageFile]   = useState<string | null>(null);

  // Left panel state
  const [panelBannerPreview, setPanelBannerPreview] = useState<string | null>(null);
  const [panelImagePreview, setPanelImagePreview]   = useState<string | null>(null);
  const [panelBannerFile, setPanelBannerFile] = useState<string | null>(null);
  const [panelImageFile, setPanelImageFile]   = useState<string | null>(null);
  const [panelName, setPanelName]             = useState("");
  const [panelDescription, setPanelDescription] = useState("");
  const [isSavingPanel, setIsSavingPanel]     = useState(false);
  const [panelError, setPanelError]           = useState("");

  const hasParentNode = navigationPath.length > 0;

  /* ── Data loading ── */
  const loadList = async (parentId: string | null) => {
    setIsLoadingList(true);
    try {
      const query = parentId ? `?parentId=${parentId}` : "";
      const res = await fetch(`/api/categories${query}`);
      const data = await res.json();
      if (res.ok) setCurrentList(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadCurrentCategoryDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`);
      const data = await res.json();
      if (res.ok) {
        setCurrentParent(data.category);
        setNavigationPath(data.breadcrumb.map((b: any) => ({ _id: b._id, name: b.name })));
        setPanelName(data.category.name);
        setPanelDescription(data.category.shortDescription || "");
        setPanelBannerPreview(data.category.bannerImage || null);
        setPanelImagePreview(data.category.image || null);
        setCurrentList(data.subCategories);
      }
    } catch (err) {
      console.error("Failed to load category detail:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => { loadList(null); }, []);

  const handleNavigateDeep = (node: CategoryNode) => {
    if (navigationPath.length >= MAX_DEPTH) {
      alert("Maximum nested depth of 15 levels reached.");
      return;
    }
    setIsLoadingList(true);
    loadCurrentCategoryDetail(node._id);
  };

  const handleNavigateBack = (index: number) => {
    if (index === -1) {
      setNavigationPath([]);
      setCurrentParent(null);
      loadList(null);
    } else {
      setIsLoadingList(true);
      loadCurrentCategoryDetail(navigationPath[index]._id);
    }
  };

  /* ── Image helpers ── */
  const readFileAsDataUrl = (file: File, onLoaded: (d: string) => void, onError: (m: string) => void) => {
    if (file.size > 4 * 1024 * 1024) { onError("Image must be under 4MB"); return; }
    const reader = new FileReader();
    reader.onload = () => onLoaded(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImageIfNeeded = async (dataUrl: string | null): Promise<string | null> => {
    if (!dataUrl) return null;
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl, folder: "onecarta/categories" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Image upload failed");
    return data.url;
  };

  /* ── Modal handlers ── */
  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "banner" | "image") => {
    const file = e.target.files?.[0]; if (!file) return;
    readFileAsDataUrl(file, (d) => {
      if (target === "banner") { setModalBannerPreview(d); setModalBannerFile(d); }
      else { setModalImagePreview(d); setModalImageFile(d); }
    }, (m) => setModalError(m));
    e.target.value = "";
  };

  const resetModalState = () => {
    setModalCategoryName(""); setModalDescription(""); setActiveEditId(null);
    setModalBannerPreview(null); setModalImagePreview(null);
    setModalBannerFile(null); setModalImageFile(null); setModalError("");
  };

  const handleOpenCreateModal = () => { resetModalState(); setModalMode("create"); setShowProductModal(true); };

  const handleTriggerEditInline = (node: CategoryNode) => {
    setModalMode("edit"); setActiveEditId(node._id);
    setModalCategoryName(node.name); setModalDescription(node.shortDescription || "");
    setModalBannerPreview(node.bannerImage || null); setModalImagePreview(node.image || null);
    setModalBannerFile(null); setModalImageFile(null); setModalError("");
    setShowProductModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCategoryName.trim()) return;
    setIsSubmitting(true); setModalError("");
    try {
      const [bannerUrl, imageUrl] = await Promise.all([
        uploadImageIfNeeded(modalBannerFile), uploadImageIfNeeded(modalImageFile),
      ]);
      if (modalMode === "create") {
        const res = await fetch("/api/categories", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: modalCategoryName, shortDescription: modalDescription,
            bannerImage: bannerUrl, image: imageUrl, parentId: currentParent ? currentParent._id : null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create category");
      } else if (modalMode === "edit" && activeEditId) {
        const payload: any = { name: modalCategoryName, shortDescription: modalDescription };
        if (bannerUrl) payload.bannerImage = bannerUrl;
        if (imageUrl) payload.image = imageUrl;
        const res = await fetch(`/api/categories/${activeEditId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update category");
      }
      if (currentParent) await loadCurrentCategoryDetail(currentParent._id);
      else await loadList(null);
      resetModalState(); setShowProductModal(false);
    } catch (err: any) {
      setModalError(err.message || "Something went wrong");
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteNode = async (id: string) => {
    if (!confirm("Are you sure you want to remove this category?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) setCurrentList((prev) => prev.filter((n) => n._id !== id));
    } catch (err) { console.error("Failed to delete category:", err); }
  };

  /* ── Panel handlers ── */
  const handlePanelFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "banner" | "image") => {
    const file = e.target.files?.[0]; if (!file) return;
    readFileAsDataUrl(file, (d) => {
      if (target === "banner") { setPanelBannerPreview(d); setPanelBannerFile(d); }
      else { setPanelImagePreview(d); setPanelImageFile(d); }
    }, (m) => setPanelError(m));
    e.target.value = "";
  };

  const handleUpdatePanel = async () => {
    if (!currentParent) return;
    if (!panelName.trim()) { setPanelError("Category name is required"); return; }
    setIsSavingPanel(true); setPanelError("");
    try {
      const [bannerUrl, imageUrl] = await Promise.all([
        uploadImageIfNeeded(panelBannerFile), uploadImageIfNeeded(panelImageFile),
      ]);
      const payload: any = { name: panelName, shortDescription: panelDescription };
      if (bannerUrl) payload.bannerImage = bannerUrl;
      if (imageUrl) payload.image = imageUrl;
      const res = await fetch(`/api/categories/${currentParent._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category");
      setCurrentParent(data);
      setNavigationPath((prev) => {
        const updated = [...prev];
        if (updated.length > 0) updated[updated.length - 1] = { _id: data._id, name: data.name };
        return updated;
      });
    } catch (err: any) {
      setPanelError(err.message || "Something went wrong");
    } finally { setIsSavingPanel(false); }
  };

  const filteredList = currentList.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ───────────────────────────── RENDER ───────────────────────────── */
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-6 sm:p-8 select-none">

      {/* ══ PAGE HEADER ══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-6">

        {/* Left: icon + title + breadcrumb */}
        <div className="flex items-center gap-3">
          {hasParentNode && (
            <button
              type="button"
              onClick={() => handleNavigateBack(navigationPath.length - 2)}
              className="w-9 h-9 border border-gray-200 bg-white rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all shrink-0"
            >
              <ArrowLeft size={15} />
            </button>
          )}

          {!hasParentNode ? (
            /* Root: big header like Customers page */
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Network size={20} className="text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Categories</h1>
                <p className="text-sm text-gray-400 font-medium mt-0.5">
                  {isLoadingList ? "Loading…" : `${currentList.length} total categor${currentList.length === 1 ? "y" : "ies"}`}
                </p>
              </div>
            </div>
          ) : (
            /* Nested: breadcrumb trail */
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 flex-wrap">
              <span
                onClick={() => handleNavigateBack(-1)}
                className="hover:text-indigo-600 cursor-pointer transition-colors"
              >
                Categories
              </span>
              {navigationPath.map((pathNode, idx) => (
                <React.Fragment key={pathNode._id}>
                  <ChevronRight size={14} className="text-gray-300 shrink-0" />
                  <span
                    onClick={() => handleNavigateBack(idx)}
                    className={`cursor-pointer transition-colors max-w-[140px] truncate ${
                      idx === navigationPath.length - 1
                        ? "text-gray-900 font-bold"
                        : "hover:text-indigo-600"
                    }`}
                  >
                    {pathNode.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Right: search + add button */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search directory..."
              className="pl-9 pr-4 py-2.5 text-sm font-medium bg-white outline-none w-56 text-gray-700 placeholder-gray-400"
            />
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus size={15} />
            {hasParentNode ? "Add Sub Category" : "Add Categories"}
          </button>
        </div>
      </div>

      {/* ══ BODY ══════════════════════════════════════════════════════════ */}

      {!hasParentNode ? (

        /* ── ROOT: flat category table ── */
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {isLoadingList ? (
            <div className="p-16 flex items-center justify-center gap-2 text-gray-400 text-sm font-semibold">
              <Loader2 size={18} className="animate-spin text-indigo-500" /> Loading categories…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
                    <th className="px-4 py-3.5 w-10"></th>
                    <th className="px-4 py-3.5">Categories</th>
                    <th className="px-4 py-3.5">Total Subcategory</th>
                    <th className="px-4 py-3.5 text-center w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 text-gray-300">
                            <Box size={22} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-700">No categories yet</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Add Categories" to create your first one</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((node) => (
                      <tr key={node._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-3 text-center text-gray-300">
                          <GripVertical size={15} className="mx-auto" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                              {node.image
                                ? <img src={node.image} alt={node.name} className="w-full h-full object-cover" />
                                : <ImageIcon size={18} />}
                            </div>
                            <div>
                              <span
                                onClick={() => handleNavigateDeep(node)}
                                className="font-bold text-sm text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                {node.name}
                              </span>
                              {node.subCategoryCount > 0 && (
                                <span className="text-xs text-gray-400 block mt-0.5">
                                  {node.subCategoryCount} subcategor{node.subCategoryCount === 1 ? "y" : "ies"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-600 tabular-nums">
                          {node.subCategoryCount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-0.5">
                            <button onClick={() => handleNavigateDeep(node)} type="button"
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => handleTriggerEditInline(node)} type="button"
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteNode(node._id)} type="button"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : (

        /* ── NESTED: two-column (edit panel + subcategory list) ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT: edit panel */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-5">
            {panelError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl">
                {panelError}
              </div>
            )}

            {/* Banner */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Banner / Cover</label>
              <div className="border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl p-6 flex flex-col items-center justify-center min-h-40 group hover:border-indigo-300 transition-colors text-center">
                {panelBannerPreview
                  ? <img src={panelBannerPreview} alt="Banner" className="max-h-32 rounded-lg object-cover mb-2" />
                  : <ImageIcon size={30} className="text-gray-300 mb-2 group-hover:text-indigo-400 transition-colors" />}
                <label className="bg-white border border-gray-200 text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-sm">
                  Add Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePanelFileChange(e, "banner")} />
                </label>
                <p className="text-[10px] text-gray-400 mt-3 leading-relaxed max-w-xs">
                  Recommended size: 1300×380px. Max 4MB.
                </p>
              </div>
            </div>

            {/* Image + name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Image</label>
                <div className="border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl p-4 flex flex-col items-center justify-center aspect-square group hover:border-indigo-300 transition-colors text-center">
                  {panelImagePreview
                    ? <img src={panelImagePreview} alt="" className="max-h-16 w-16 object-cover rounded-lg mb-1" />
                    : <ImageIcon size={22} className="text-gray-300 mb-1 group-hover:text-indigo-400 transition-colors" />}
                  <label className="bg-white border border-gray-200 text-indigo-600 px-2.5 py-1 rounded-md text-[10px] font-black cursor-pointer shadow-sm">
                    Add Image
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePanelFileChange(e, "image")} />
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={panelName}
                    onChange={(e) => setPanelName(e.target.value.slice(0, 50))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold bg-white text-gray-700 outline-none focus:border-indigo-500 transition-colors"
                  />
                  <span className="text-[10px] text-gray-400 font-medium block text-right mt-1.5">
                    {panelName.length}/50
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Short Description</label>
              <textarea
                rows={3}
                value={panelDescription}
                onChange={(e) => setPanelDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl text-xs font-semibold outline-none text-gray-600 resize-none focus:border-indigo-500 transition-colors"
                placeholder="Short description…"
              />
              <p className="text-[10px] text-gray-400 mt-1.5">Recommended image: 500×500px (square). Max 4MB.</p>
            </div>

            <button
              type="button"
              onClick={handleUpdatePanel}
              disabled={isSavingPanel}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSavingPanel && <Loader2 size={14} className="animate-spin" />}
              {isSavingPanel ? "Saving…" : "Update"}
            </button>
          </div>

          {/* RIGHT: subcategory table */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {isLoadingList ? (
              <div className="p-16 flex items-center justify-center gap-2 text-gray-400 text-sm font-semibold">
                <Loader2 size={18} className="animate-spin text-indigo-500" /> Loading subcategories…
              </div>
            ) : filteredList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
                      <th className="px-4 py-3.5 w-10"></th>
                      <th className="px-4 py-3.5">Categories</th>
                      <th className="px-4 py-3.5">Total Subcategory</th>
                      <th className="px-4 py-3.5 text-center w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                    {filteredList.map((subNode) => (
                      <tr key={subNode._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-3 text-center text-gray-300">
                          <GripVertical size={15} className="mx-auto" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                              {subNode.image
                                ? <img src={subNode.image} alt={subNode.name} className="w-full h-full object-cover" />
                                : <ImageIcon size={16} />}
                            </div>
                            <span
                              onClick={() => handleNavigateDeep(subNode)}
                              className="font-bold text-sm text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              {subNode.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-600 tabular-nums">
                          {subNode.subCategoryCount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-0.5">
                            <button onClick={() => handleNavigateDeep(subNode)} type="button"
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => handleTriggerEditInline(subNode)} type="button"
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteNode(subNode._id)} type="button"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Empty sub-cat state */
              <div className="p-16 flex flex-col items-center justify-center min-h-[380px] text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 text-gray-300 mb-4">
                  <Box size={24} />
                </div>
                <h4 className="text-sm font-bold text-gray-800">No sub-categories yet</h4>
                <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">
                  Get started by adding your first sub-category
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Plus size={14} /> Add Sub Category
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ CREATE / EDIT MODAL ══════════════════════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowProductModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full border border-gray-100 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={() => setShowProductModal(false)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors">
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              {modalMode === "create"
                ? hasParentNode ? "Create Sub-Category" : "Create Category"
                : "Edit Category"}
            </h3>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mt-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4 mt-4">
              {/* Banner upload */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Banner / Cover</label>
                <div className="border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl p-5 flex flex-col items-center justify-center group hover:border-indigo-300 transition-colors text-center">
                  {modalBannerPreview
                    ? <img src={modalBannerPreview} alt="Banner" className="max-h-28 rounded-lg object-cover mb-2" />
                    : <ImageIcon size={26} className="text-gray-300 mb-1 group-hover:text-indigo-400 transition-colors" />}
                  <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
                    Recommended size: 1300×380px. Max 4MB.
                  </p>
                  <label className="bg-white border border-gray-200 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-sm">
                    Add Image
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleModalFileChange(e, "banner")} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Image upload */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Image</label>
                  <div className="border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl p-4 flex flex-col items-center justify-center min-h-[180px] group hover:border-indigo-300 transition-colors text-center">
                    {modalImagePreview
                      ? <img src={modalImagePreview} alt="" className="max-h-20 w-20 object-cover rounded-lg mb-1" />
                      : <ImageIcon size={24} className="text-gray-300 mb-1 group-hover:text-indigo-400 transition-colors" />}
                    <p className="text-[9px] text-gray-400 leading-relaxed mb-2">
                      Square image (1:1). Recommended: 500×500px. Max 4MB.
                    </p>
                    <label className="bg-white border border-gray-200 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-sm">
                      Add Image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleModalFileChange(e, "image")} />
                    </label>
                  </div>
                </div>

                {/* Name + description */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" required
                      value={modalCategoryName}
                      onChange={(e) => setModalCategoryName(e.target.value.slice(0, 50))}
                      placeholder="Category name"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-white text-gray-700 outline-none focus:border-indigo-500 transition-colors"
                    />
                    <span className="text-[10px] text-gray-400 font-medium block text-right mt-1">
                      {modalCategoryName.length}/50
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Short Description</label>
                    <textarea
                      rows={4}
                      value={modalDescription}
                      onChange={(e) => setModalDescription(e.target.value)}
                      placeholder="Short description…"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 outline-none focus:border-indigo-500 resize-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {isSubmitting ? "Saving…" : modalMode === "create" ? "Create" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}