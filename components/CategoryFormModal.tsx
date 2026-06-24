"use client";

import React, { useState } from "react";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";

interface CategoryFormModalProps {
  isOpen: boolean;
  mode: "category" | "sub-category"; // controls the title text only
  parentId: string | null; // null = top-level category
  onClose: () => void;
  onCreated: () => void; // called after a successful create, so the parent can refresh its list
}

export default function CategoryFormModal({ isOpen, mode, parentId, onClose, onCreated }: CategoryFormModalProps) {
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<string | null>(null); // base64 data URL ready to upload
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "banner" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be under 4MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (target === "banner") {
        setBannerPreview(dataUrl);
        setBannerFile(dataUrl);
      } else {
        setImagePreview(dataUrl);
        setImageFile(dataUrl);
      }
    };
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

  const resetForm = () => {
    setName("");
    setShortDescription("");
    setBannerPreview(null);
    setImagePreview(null);
    setBannerFile(null);
    setImageFile(null);
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const [bannerUrl, imageUrl] = await Promise.all([
        uploadImageIfNeeded(bannerFile),
        uploadImageIfNeeded(imageFile),
      ]);

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          shortDescription,
          bannerImage: bannerUrl,
          image: imageUrl,
          parentId: parentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");

      resetForm();
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl max-w-2xl w-full border border-gray-100 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === "sub-category" ? "Create sub-category" : "Create Category"}
          </h2>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Banner Upload */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-800 mb-2">Banner/Cover</label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50/50">
            {bannerPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerPreview} alt="Banner preview" className="mx-auto max-h-32 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => { setBannerPreview(null); setBannerFile(null); }}
                  className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-red-500 cursor-pointer shadow-sm"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ImageIcon size={20} />
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Upload a banner image for the category. Recommended size is 1300×380 pixels. Maximum file size is 4MB.
                </p>
              </>
            )}
            <label className="inline-block mt-3 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg cursor-pointer transition-colors">
              Add Image
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "banner")} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Square Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Image</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50/50 h-full flex flex-col items-center justify-center">
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Image preview" className="mx-auto max-h-28 w-28 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageFile(null); }}
                    className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-red-500 cursor-pointer shadow-sm"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-3">
                    <ImageIcon size={20} />
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Upload a square image for the category (1:1) aspect ratio. Recommended size is 500×500 pixels. Maximum file size is 4MB.
                  </p>
                </>
              )}
              <label className="inline-block mt-1 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg cursor-pointer transition-colors">
                Add Image
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "image")} />
              </label>
            </div>
          </div>

          {/* Name + Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                placeholder="Category Name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-gray-400 text-right mt-1">Character limit: 50</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Short Description</label>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Short description..."
                rows={5}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl cursor-pointer transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}