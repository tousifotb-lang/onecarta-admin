"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Store, 
  Settings2, 
  QrCode, 
  Image as ImageIcon, 
  Sparkles, 
  Download, 
  Upload, 
  Save 
} from "lucide-react";

export default function StoreProfileIdentityPage() {
  const router = useRouter();

  // Shop Basic Info States
  const [businessId, setBusinessId] = useState("207620");
  const [businessName, setBusinessName] = useState("Onecarta Store");
  const [businessType, setBusinessType] = useState("E-commerce");
  const [shopEmail, setShopEmail] = useState("admin@onecarta.shop");
  const [shopPhone, setShopPhone] = useState("+88017XXXXXXXX");
  const [country, setCountry] = useState("Bangladesh");
  const [shopAddress, setShopAddress] = useState("Dhaka, Bangladesh");
  const [seoDetails, setSeoDetails] = useState("");
  const [announcement, setAnnouncement] = useState("");

  // Shop Settings States
  const [language, setLanguage] = useState("English");
  const [maintainStock, setMaintainStock] = useState(true);
  const [showSoldCount, setShowSoldCount] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(false);
  const [enablePromo, setEnablePromo] = useState(true);
  const [themeColor, setThemeColor] = useState("#10b981");

  return (
    // Replaced transparent container with solid dark-slate backend profile matching your main workspace
    <div className="min-h-screen bg-[#0f172a] text-gray-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header Section */}
      <div className="flex items-center gap-4 border-b border-gray-800 pb-5">
        <button 
          onClick={() => router.push("/manage-store")}
          className="p-2 bg-gray-800/80 border border-gray-700/50 hover:bg-gray-700 rounded-xl transition-all cursor-pointer text-gray-400 hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
            <span>Shop Settings</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 lowercase font-normal tracking-normal">
              / store-profile
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Manage your global storefront identity, configurations, and metadata setup.
          </p>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Input Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Block 1: Shop Basic Info */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-gray-800 pb-3">
              <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                <Store size={16} />
              </div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                Shop Basic Info
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Business ID</label>
                <input type="text" readOnly value={businessId} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-gray-500 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden opacity-60 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Business Name</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-emerald-500 transition-colors placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Business Type</label>
                <input type="text" value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Shop Email</label>
                <input type="email" value={shopEmail} onChange={(e) => setShopEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Shop Phone Number</label>
                <input type="text" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Country</label>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-emerald-500 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Shop Address</label>
              <input type="text" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-emerald-500 transition-colors" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Shop Details (SEO & Meta Description)</label>
              <textarea rows={3} value={seoDetails} onChange={(e) => setSeoDetails(e.target.value)} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-emerald-500 transition-colors resize-none placeholder:text-gray-600" placeholder="Enter SEO description tags..." />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Top Bar Announcement Message</label>
              <input type="text" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-emerald-500 transition-colors" placeholder="Flash Sale! 50% off on all items..." />
            </div>

            <div className="flex justify-end pt-2">
              <button className="bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer">
                <Save size={14} /> Update Shop Info
              </button>
            </div>
          </div>

          {/* Block 2: Shop Settings Toggles */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-gray-800 pb-3">
              <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                <Settings2 size={16} />
              </div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                Shop Settings
              </h2>
            </div>

            <div className="space-y-4 divide-y divide-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Default Language</h3>
                  <p className="text-[11px] text-gray-400">Set the default storefront system localization language.</p>
                </div>
                <div className="flex gap-2 bg-gray-950 p-1 border border-gray-800 rounded-xl max-w-fit">
                  <button type="button" onClick={() => setLanguage("English")} className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${language === "English" ? "bg-emerald-500 text-gray-950" : "text-gray-400 hover:text-white"}`}>English</button>
                  <button type="button" onClick={() => setLanguage("Bangla")} className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${language === "Bangla" ? "bg-emerald-500 text-gray-950" : "text-gray-400 hover:text-white"}`}>Bangla</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Maintain Stock Quantity</h3>
                  <p className="text-[11px] text-gray-400">Prevent checkouts on products when operational count reaches zero.</p>
                </div>
                <button type="button" onClick={() => setMaintainStock(!maintainStock)} className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${maintainStock ? 'bg-emerald-500' : 'bg-gray-800'}`}>
                  <div className={`bg-gray-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${maintainStock ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Show Product Sold Count</h3>
                  <p className="text-[11px] text-gray-400">Display total units completed metadata statistics dynamically onto cards.</p>
                </div>
                <button type="button" onClick={() => setShowSoldCount(!showSoldCount)} className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${showSoldCount ? 'bg-emerald-500' : 'bg-gray-800'}`}>
                  <div className={`bg-gray-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${showSoldCount ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Allow Product Image Downloads</h3>
                  <p className="text-[11px] text-gray-400">Enable absolute file context-menu configurations for users.</p>
                </div>
                <button type="button" onClick={() => setAllowDownloads(!allowDownloads)} className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${allowDownloads ? 'bg-emerald-500' : 'bg-gray-800'}`}>
                  <div className={`bg-gray-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${allowDownloads ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Enable Promo Code for Place Order</h3>
                  <p className="text-[11px] text-gray-400">Inject application coupon verification fields upon direct checkout flows.</p>
                </div>
                <button type="button" onClick={() => setEnablePromo(!enablePromo)} className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${enablePromo ? 'bg-emerald-500' : 'bg-gray-800'}`}>
                  <div className={`bg-gray-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${enablePromo ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button className="bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer">
                <Save size={14} /> Update Settings
              </button>
            </div>
          </div>
        </div>

        {/* Right Stack Widgets Column */}
        <div className="space-y-6">
          
          {/* Widget 1: Shop QR */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2.5 text-left">
              <QrCode size={15} className="text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Shop QR Code</h2>
            </div>
            <div className="bg-white p-3 rounded-xl inline-block shadow-inner mx-auto border border-gray-200">
              <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs border-2 border-dashed border-gray-300 rounded-lg">
                QR Placeholder
              </div>
            </div>
            <div className="text-center">
              <span className="text-[10px] bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg text-gray-400 font-mono break-all block">
                https://onecarta.shop/visit
              </span>
            </div>
            <button className="w-full bg-gray-950 hover:bg-gray-800 border border-gray-800 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Download size={14} /> Save QR Code
            </button>
          </div>

          {/* Widget 2: Shop Logo */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2.5 text-left">
              <ImageIcon size={15} className="text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Shop Logo</h2>
            </div>
            <div className="w-full h-28 bg-gray-950 border border-gray-800 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400">
              <ImageIcon size={22} className="text-gray-600" />
              <span className="text-[11px] font-semibold">No Logo Configured</span>
            </div>
            <button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={14} /> Upload Shop Logo
            </button>
          </div>

          {/* Widget 3: Shop Favicon */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2.5 text-left">
              <Sparkles size={15} className="text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Shop Favicon</h2>
            </div>
            <div className="w-full h-24 bg-gray-950 border border-gray-800 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400">
              <Sparkles size={18} className="text-gray-600" />
              <span className="text-[11px] font-semibold">No Favicon Selected</span>
            </div>
            <button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={14} /> Upload Shop Favicon
            </button>
          </div>

          {/* Widget 4: Theme */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2.5">
              <Settings2 size={15} className="text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Shop Theme</h2>
            </div>
            <div className="flex items-center gap-3 bg-gray-950 border border-gray-800 rounded-xl p-3">
              <input 
                type="color" 
                value={themeColor} 
                onChange={(e) => setThemeColor(e.target.value)} 
                className="w-9 h-9 bg-transparent border-0 rounded-lg cursor-pointer" 
              />
              <div>
                <span className="text-xs font-bold text-white block">Theme Accent Color</span>
                <span className="text-[11px] text-gray-400 font-mono uppercase">{themeColor}</span>
              </div>
            </div>
            <button className="w-full bg-gray-950 hover:bg-gray-800 border border-gray-800 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-colors cursor-pointer">
              Save Theme Color
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}