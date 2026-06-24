"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Plus, Eye, Edit2, Trash2, ChevronRight,
  X, Image as ImageIcon, ArrowLeft, GripVertical, Box, Loader2
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
  // Current list being viewed: either top-level categories, or the subcategories
  // of whatever category is currently open (driven entirely by the backend).
  const [currentList, setCurrentList] = useState<CategoryNode[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Breadcrumb / navigation path, rebuilt from the backend each time we navigate
  // into a category, so it always reflects real DB ancestry (not just client memory).
  const [navigationPath, setNavigationPath] = useState<BreadcrumbNode[]>([]);
  const [currentParent, setCurrentParent] = useState<CategoryNode | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit modal state
  const [showModal, setShowProductModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalCategoryName, setModalCategoryName] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Image upload buffers (modal)
  const [modalBannerPreview, setModalBannerPreview] = useState<string | null>(null);
  const [modalImagePreview, setModalImagePreview] = useState<string | null>(null);
  const [modalBannerFile, setModalBannerFile] = useState<string | null>(null);
  const [modalImageFile, setModalImageFile] = useState<string | null>(null);

  // Image upload buffers (left-side "current category" edit panel, only shown when inside a category)
  const [panelBannerPreview, setPanelBannerPreview] = useState<string | null>(null);
  const [panelImagePreview, setPanelImagePreview] = useState<string | null>(null);
  const [panelBannerFile, setPanelBannerFile] = useState<string | null>(null);
  const [panelImageFile, setPanelImageFile] = useState<string | null>(null);
  const [panelName, setPanelName] = useState("");
  const [panelDescription, setPanelDescription] = useState("");
  const [isSavingPanel, setIsSavingPanel] = useState(false);
  const [panelError, setPanelError] = useState("");

  const hasParentNode = navigationPath.length > 0;

  // ---- Data loading: fetches the list for whatever the current parentId is ----
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

  // Loads the currently-open category itself (name/desc/images) plus its breadcrumb,
  // used whenever we navigate into a category so the left edit panel is accurate.
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

  // Initial load: top-level categories
  useEffect(() => {
    loadList(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavigateDeep = (node: CategoryNode) => {
    if (navigationPath.length >= MAX_DEPTH) {
      alert("Maximum nested structural limitation path depth of 15 levels achieved.");
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
      const targetId = navigationPath[index]._id;
      setIsLoadingList(true);
      loadCurrentCategoryDetail(targetId);
    }
  };

  // ---- Image handling (shared helper) ----
  const readFileAsDataUrl = (
    file: File,
    onLoaded: (dataUrl: string) => void,
    onError: (msg: string) => void
  ) => {
    if (file.size > 4 * 1024 * 1024) {
      onError("Image must be under 4MB");
      return;
    }
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

  // ---- Modal (create / edit) handlers ----
  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "banner" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsDataUrl(
      file,
      (dataUrl) => {
        if (target === "banner") {
          setModalBannerPreview(dataUrl);
          setModalBannerFile(dataUrl);
        } else {
          setModalImagePreview(dataUrl);
          setModalImageFile(dataUrl);
        }
      },
      (msg) => setModalError(msg)
    );
    e.target.value = ""; // allow re-selecting the same/different file again
  };

  const resetModalState = () => {
    setModalCategoryName("");
    setModalDescription("");
    setActiveEditId(null);
    setModalBannerPreview(null);
    setModalImagePreview(null);
    setModalBannerFile(null);
    setModalImageFile(null);
    setModalError("");
  };

  const handleOpenCreateModal = () => {
    resetModalState();
    setModalMode("create");
    setShowProductModal(true);
  };

  const handleTriggerEditInline = (node: CategoryNode) => {
    setModalMode("edit");
    setActiveEditId(node._id);
    setModalCategoryName(node.name);
    setModalDescription(node.shortDescription || "");
    setModalBannerPreview(node.bannerImage || null);
    setModalImagePreview(node.image || null);
    setModalBannerFile(null);
    setModalImageFile(null);
    setModalError("");
    setShowProductModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCategoryName.trim()) return;

    setIsSubmitting(true);
    setModalError("");

    try {
      const [bannerUrl, imageUrl] = await Promise.all([
        uploadImageIfNeeded(modalBannerFile),
        uploadImageIfNeeded(modalImageFile),
      ]);

      if (modalMode === "create") {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: modalCategoryName,
            shortDescription: modalDescription,
            bannerImage: bannerUrl,
            image: imageUrl,
            parentId: currentParent ? currentParent._id : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create category");
      } else if (modalMode === "edit" && activeEditId) {
        const payload: any = { name: modalCategoryName, shortDescription: modalDescription };
        if (bannerUrl) payload.bannerImage = bannerUrl;
        if (imageUrl) payload.image = imageUrl;

        const res = await fetch(`/api/categories/${activeEditId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update category");
      }

      // Refresh whatever list we're currently viewing so the change shows immediately
      if (currentParent) {
        await loadCurrentCategoryDetail(currentParent._id);
      } else {
        await loadList(null);
      }

      resetModalState();
      setShowProductModal(false);
    } catch (err: any) {
      setModalError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (!confirm("Are you sure you want to completely remove this node element branch?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCurrentList((prev) => prev.filter((node) => node._id !== id));
      }
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  };

  // ---- Left edit panel handlers (only visible once inside a category) ----
  const handlePanelFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "banner" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsDataUrl(
      file,
      (dataUrl) => {
        if (target === "banner") {
          setPanelBannerPreview(dataUrl);
          setPanelBannerFile(dataUrl);
        } else {
          setPanelImagePreview(dataUrl);
          setPanelImageFile(dataUrl);
        }
      },
      (msg) => setPanelError(msg)
    );
    e.target.value = "";
  };

  const handleUpdatePanel = async () => {
    if (!currentParent) return;
    if (!panelName.trim()) {
      setPanelError("Category name is required");
      return;
    }
    setIsSavingPanel(true);
    setPanelError("");
    try {
      const [bannerUrl, imageUrl] = await Promise.all([
        uploadImageIfNeeded(panelBannerFile),
        uploadImageIfNeeded(panelImageFile),
      ]);

      const payload: any = { name: panelName, shortDescription: panelDescription };
      if (bannerUrl) payload.bannerImage = bannerUrl;
      if (imageUrl) payload.image = imageUrl;

      const res = await fetch(`/api/categories/${currentParent._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category");

      setCurrentParent(data);
      // Keep the breadcrumb's last label in sync with the new name
      setNavigationPath((prev) => {
        const updated = [...prev];
        if (updated.length > 0) updated[updated.length - 1] = { _id: data._id, name: data.name };
        return updated;
      });
    } catch (err: any) {
      setPanelError(err.message || "Something went wrong");
    } finally {
      setIsSavingPanel(false);
    }
  };

  const filteredList = currentList.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-4 sm:p-6 lg:p-8 select-none">

      {/* Dynamic breadcrumb header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          {hasParentNode && (
            <button
              type="button"
              onClick={() => handleNavigateBack(navigationPath.length - 2)}
              className="p-2 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 text-gray-500 cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-400">
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
                    idx === navigationPath.length - 1 ? "text-gray-900 font-bold" : "hover:text-indigo-600"
                  }`}
                >
                  {pathNode.name}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center bg-white border border-gray-200 rounded-xl shadow-3xs overflow-hidden">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search directory..."
              className="pl-3 pr-9 py-2.5 text-xs font-semibold bg-white outline-none w-56 text-gray-700 placeholder-gray-400"
            />
            <Search size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer tracking-wide transition-colors"
          >
            <Plus size={15} /> {hasParentNode ? "Add Sub Categories" : "Add Categories"}
          </button>
        </div>
      </div>

      {/* Main body */}
      {!hasParentNode ? (

        /* ROOT VIEW: simple table */
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mt-6">
          {isLoadingList ? (
            <div className="p-12 flex items-center justify-center gap-2 text-gray-400 font-semibold text-sm">
              <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading categories...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 text-gray-400 border-b border-gray-100 text-xs font-bold uppercase tracking-wider select-none">
                    <th className="p-4 w-12 text-center"></th>
                    <th className="p-4">Categories</th>
                    <th className="p-4">Total Subcategory</th>
                    <th className="p-4 w-32 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-gray-400 font-semibold text-sm">
                        No categories found. Click "Add Categories" to create your first one.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((node) => (
                      <tr key={node._id} className="hover:bg-gray-50/40 transition-colors group">
                        <td className="p-4 text-center text-gray-300"><GripVertical size={16} className="mx-auto" /></td>
                        <td className="p-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 bg-[#e9ecef] border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0 shadow-3xs overflow-hidden">
                              {node.image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={node.image} alt={node.name} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={20} />
                              )}
                            </div>
                            <div>
                              <span
                                onClick={() => handleNavigateDeep(node)}
                                className="font-bold text-gray-900 text-sm hover:text-indigo-600 transition-colors cursor-pointer block"
                              >
                                {node.name}
                              </span>
                              {node.subCategoryCount > 0 && (
                                <span className="text-xs text-gray-400 block mt-0.5">{node.subCategoryCount} subcategories</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-semibold text-gray-700 font-mono">{node.subCategoryCount}</td>
                        <td className="p-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => handleNavigateDeep(node)} type="button" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"><Eye size={15} /></button>
                            <button onClick={() => handleTriggerEditInline(node)} type="button" className="p-2 text-gray-400 hover:text-amber-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"><Edit2 size={15} /></button>
                            <button onClick={() => handleDeleteNode(node._id)} type="button" className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"><Trash2 size={15} /></button>
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

        /* NESTED VIEW: two-column split (edit panel + subcategory list) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">

          {/* LEFT: edit panel for the currently-open category */}
          <div className="lg:col-span-5 bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-5">
            {panelError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl">{panelError}</div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Banner/Cover</label>
              <div className="border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl p-6 text-center flex flex-col items-center justify-center min-h-40 group relative overflow-hidden transition-colors hover:border-indigo-300">
                {panelBannerPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={panelBannerPreview} alt="Banner" className="max-h-32 rounded-lg object-cover mb-2" />
                ) : (
                  <ImageIcon size={32} className="text-gray-300 mb-2 group-hover:text-indigo-400 transition-colors" />
                )}
                <label className="bg-white border border-gray-200 text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-bold shadow-3xs cursor-pointer">
                  Add Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePanelFileChange(e, "banner")} />
                </label>
                <p className="text-[10px] text-gray-400 mt-3 leading-relaxed max-w-xs">N.B: Upload a banner image for the category. Recommended size is 1300×380 pixels. Maximum file size is 4MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Image</label>
                <div className="border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl p-4 text-center flex flex-col items-center justify-center aspect-square group relative overflow-hidden transition-colors hover:border-indigo-300">
                  {panelImagePreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={panelImagePreview} alt="Image" className="max-h-16 w-16 object-cover rounded-lg mb-1" />
                  ) : (
                    <ImageIcon size={22} className="text-gray-300 mb-1 group-hover:text-indigo-400 transition-colors" />
                  )}
                  <label className="bg-white border border-gray-200 text-indigo-600 px-2.5 py-1 rounded-md text-[10px] font-black shadow-3xs cursor-pointer">
                    Add Image
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePanelFileChange(e, "image")} />
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={panelName}
                    onChange={(e) => setPanelName(e.target.value.slice(0, 50))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold bg-white text-gray-700 outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-gray-400 font-medium block text-right mt-1.5">Character limit: 50</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Short Description</label>
              <textarea
                rows={3}
                value={panelDescription}
                onChange={(e) => setPanelDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl text-xs font-semibold outline-none text-gray-600 resize-none focus:border-indigo-500"
                placeholder="Short description..."
              />
              <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">N.B: Upload a square image for the category (1:1) aspect ratio. Recommended size is 500×500 pixels. Maximum file size is 4MB. Note: Recommended image size: 770 × 1024 px (Sellora theme).</p>
            </div>

            <button
              type="button"
              onClick={handleUpdatePanel}
              disabled={isSavingPanel}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSavingPanel && <Loader2 size={14} className="animate-spin" />}
              {isSavingPanel ? "Saving..." : "Update"}
            </button>
          </div>

          {/* RIGHT: subcategory list */}
          <div className="lg:col-span-7 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {isLoadingList ? (
              <div className="p-12 flex items-center justify-center gap-2 text-gray-400 font-semibold text-sm">
                <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading subcategories...
              </div>
            ) : filteredList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70 text-gray-400 border-b border-gray-100 text-xs font-bold uppercase tracking-wider select-none">
                      <th className="p-4 w-12 text-center"></th>
                      <th className="p-4">Categories</th>
                      <th className="p-4">Total Subcategory</th>
                      <th className="p-4 w-32 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                    {filteredList.map((subNode) => (
                      <tr key={subNode._id} className="hover:bg-gray-50/40 transition-colors group">
                        <td className="p-4 text-center text-gray-300"><GripVertical size={16} className="mx-auto" /></td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#e9ecef] border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0 shadow-3xs overflow-hidden">
                              {subNode.image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={subNode.image} alt={subNode.name} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={16} />
                              )}
                            </div>
                            <span
                              onClick={() => handleNavigateDeep(subNode)}
                              className="font-bold text-gray-900 text-xs hover:text-indigo-600 transition-colors cursor-pointer block"
                            >
                              {subNode.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-600 font-mono">{subNode.subCategoryCount}</td>
                        <td className="p-4 text-center">
                          <div className="inline-flex items-center gap-0.5">
                            <button onClick={() => handleNavigateDeep(subNode)} type="button" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"><Eye size={14} /></button>
                            <button onClick={() => handleTriggerEditInline(subNode)} type="button" className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteNode(subNode._id)} type="button" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (

              /* Empty state */
              <div className="p-16 text-center flex flex-col items-center justify-center min-h-[420px] bg-white">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 text-gray-400 mb-3 shadow-3xs">
                  <Box size={24} />
                </div>
                <h4 className="text-sm font-bold text-gray-800">Your sub categories list is currently empty</h4>
                <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">Lets get started by adding your first sub category now</p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="mt-5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add Sub Category
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowProductModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-100 shadow-2xl p-6 relative overflow-visible animate-scaleUp max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            <button type="button" onClick={() => setShowProductModal(false)} className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer">
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-3">
              {modalMode === "create" ? (hasParentNode ? "Create sub-category" : "Create Category") : "Modify Node Attributes"}
            </h3>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mt-4">{modalError}</div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Banner/Cover</label>
                <div className="border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl p-5 text-center flex flex-col items-center justify-center group transition-colors hover:border-indigo-300">
                  {modalBannerPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={modalBannerPreview} alt="Banner" className="max-h-28 rounded-lg object-cover mb-2" />
                  ) : (
                    <ImageIcon size={26} className="text-gray-300 mb-1 group-hover:text-indigo-400 transition-colors" />
                  )}
                  <p className="text-[10px] text-gray-400 leading-relaxed mb-2">Upload a banner image for the category. Recommended size is 1300×380 pixels. Maximum file size is 4MB.</p>
                  <label className="bg-white border border-gray-200 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-3xs cursor-pointer">
                    Add Image
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleModalFileChange(e, "banner")} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Image</label>
                  <div className="border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl p-4 text-center flex flex-col items-center justify-center min-h-[180px] group transition-colors hover:border-indigo-300">
                    {modalImagePreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={modalImagePreview} alt="Image" className="max-h-20 w-20 object-cover rounded-lg mb-1" />
                    ) : (
                      <ImageIcon size={24} className="text-gray-300 mb-1 group-hover:text-indigo-400 transition-colors" />
                    )}
                    <p className="text-[9px] text-gray-400 leading-relaxed mb-2">Upload a square image for the category (1:1) aspect ratio. Recommended size is 500×500 pixels. Maximum file size is 4MB. Note: Recommended image size: 770 × 1024 px (Sellora theme).</p>
                    <label className="bg-white border border-gray-200 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-3xs cursor-pointer">
                      Add Image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleModalFileChange(e, "image")} />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={modalCategoryName}
                      onChange={(e) => setModalCategoryName(e.target.value.slice(0, 50))}
                      placeholder="Category Name"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-white text-gray-700 outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-gray-400 font-medium block text-right mt-1">Character limit: 50</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Short Description</label>
                    <textarea
                      rows={4}
                      value={modalDescription}
                      onChange={(e) => setModalDescription(e.target.value)}
                      placeholder="Short description..."
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {isSubmitting ? "Saving..." : modalMode === "create" ? "Create" : "Save Changes"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}