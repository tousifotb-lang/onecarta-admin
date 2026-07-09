"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2,
  Image as ImageIcon, X, Layers, LayoutGrid, Link as LinkIcon, Eye, EyeOff
} from "lucide-react";

interface Banner {
  _id: string;
  type: "hero" | "side";
  imageUrl: string;
  href: string;
  title: string;
  isActive: boolean;
  order: number;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadToCloudinary(file: File): Promise<string> {
  const base64Image = await fileToBase64(file);

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: base64Image,
      folder: "onecarta/banners",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Upload failed");
  }

  return data.url;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"hero" | "side">("hero");
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [formImageUrl, setFormImageUrl] = useState("");
  const [formHref, setFormHref] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchBanners() {
    try {
      const res = await fetch("/api/banners");
      const data = await res.json();
      if (res.ok) setBanners(data);
    } catch (err) {
      console.error("Failed to fetch banners", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchBanners();
  }, []);

  const heroBanners = banners.filter((b) => b.type === "hero").sort((a, b) => a.order - b.order);
  const sideBanners = banners.filter((b) => b.type === "side").sort((a, b) => a.order - b.order);

  const openAddModal = (type: "hero" | "side") => {
    if (type === "side" && sideBanners.length >= 2) {
      alert("Maximum 2 side banners allowed. Delete one first to add a new one.");
      return;
    }
    setModalType(type);
    setEditingBanner(null);
    setFormImageUrl("");
    setFormHref("");
    setFormTitle("");
    setFormIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    setModalType(banner.type);
    setEditingBanner(banner);
    setFormImageUrl(banner.imageUrl);
    setFormHref(banner.href);
    setFormTitle(banner.title);
    setFormIsActive(banner.isActive);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setFormImageUrl(url);
    } catch (err) {
      alert("Image upload failed. Please try again.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formImageUrl) {
      alert("Please upload a banner image first.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingBanner) {
        await fetch(`/api/banners/${editingBanner._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: formImageUrl,
            href: formHref || "/",
            title: formTitle,
            isActive: formIsActive,
          }),
        });
      } else {
        await fetch("/api/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: modalType,
            imageUrl: formImageUrl,
            href: formHref || "/",
            title: formTitle,
            isActive: formIsActive,
          }),
        });
      }
      closeModal();
      fetchBanners();
    } catch (err) {
      alert("Failed to save banner. Please try again.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner? This cannot be undone.")) return;
    try {
      await fetch(`/api/banners/${id}`, { method: "DELETE" });
      fetchBanners();
    } catch (err) {
      alert("Failed to delete banner.");
      console.error(err);
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      await fetch(`/api/banners/${banner._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      fetchBanners();
    } catch (err) {
      console.error("Failed to toggle banner", err);
    }
  };

  const moveBanner = async (list: Banner[], index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const current = list[index];
    const target = list[targetIndex];

    try {
      await Promise.all([
        fetch(`/api/banners/${current._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: target.order }),
        }),
        fetch(`/api/banners/${target._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: current.order }),
        }),
      ]);
      fetchBanners();
    } catch (err) {
      console.error("Failed to reorder banners", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center gap-2 font-bold text-gray-500 text-xs tracking-wider uppercase">
        <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading banners...
      </div>
    );
  }

  const renderBannerList = (list: Banner[], type: "hero" | "side") => (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
          {type === "hero" ? <Layers size={16} className="text-indigo-600" /> : <LayoutGrid size={16} className="text-indigo-600" />}
          {type === "hero" ? "Hero Slider Banners" : "Side Banners"}
        </h2>
        <button
          onClick={() => openAddModal(type)}
          disabled={type === "side" && list.length >= 2}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <Plus size={14} /> Add Banner
        </button>
      </div>

      {list.length === 0 ? (
        <div className="py-10 text-center text-xs font-bold text-gray-400">
          No {type === "hero" ? "hero slider" : "side"} banners yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((banner, index) => (
            <div key={banner._id} className="flex items-center gap-4 border border-gray-100 rounded-xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.imageUrl}
                alt={banner.title || "Banner"}
                className="w-28 h-16 object-cover rounded-lg border border-gray-100 shrink-0"
              />

              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 truncate">{banner.title || "Untitled banner"}</p>
                <p className="text-[10px] font-medium text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                  <LinkIcon size={10} /> {banner.href}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => moveBanner(list, index, "up")}
                  disabled={index === 0}
                  className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  onClick={() => moveBanner(list, index, "down")}
                  disabled={index === list.length - 1}
                  className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  onClick={() => toggleActive(banner)}
                  className={`p-1.5 border rounded-lg cursor-pointer ${
                    banner.isActive
                      ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      : "border-gray-200 text-gray-400 hover:bg-gray-50"
                  }`}
                  title={banner.isActive ? "Active — click to hide" : "Hidden — click to show"}
                >
                  {banner.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  onClick={() => openEditModal(banner)}
                  className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 cursor-pointer"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(banner._id)}
                  className="p-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 p-4 sm:p-6 lg:p-8 space-y-6 antialiased">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Banners</h1>
        <p className="text-xs font-semibold text-gray-400 mt-0.5">Manage the storefront homepage banners</p>
      </div>

      {renderBannerList(heroBanners, "hero")}
      {renderBannerList(sideBanners, "side")}

      {modalOpen && (
        <div
          className="fixed inset-0 bg-gray-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-indigo-50/40">
              <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide">
                {editingBanner ? "Edit Banner" : `Add ${modalType === "hero" ? "Hero" : "Side"} Banner`}
              </h3>
              <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-2">Banner Image</label>
                {formImageUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formImageUrl} alt="Banner preview" className="w-full h-32 object-cover rounded-xl border border-gray-100" />
                    <button
                      onClick={() => setFormImageUrl("")}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg text-gray-600 hover:text-red-600 shadow-sm cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-[11px] font-bold">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={20} />
                        <span className="text-[11px] font-bold">Click to upload image</span>
                      </>
                    )}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-2">Link (where it goes on click)</label>
                <input
                  type="text"
                  value={formHref}
                  onChange={(e) => setFormHref(e.target.value)}
                  placeholder="/products?category=electronics"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide block mb-2">Internal Label (for your reference only)</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Eid Sale Banner"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-700">Show this banner on the storefront</span>
              </label>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2.5">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                Save Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}