"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Users, Image as ImageIcon,
  Tag, FileText, Store, BarChart3, Truck, ShieldCheck, Handshake,
  Code2, Settings, User, LogOut, ChevronUp, Layers
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Self-hide condition on route entry login screen
  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    // The admin_token cookie is httpOnly, so it can only be cleared by a
    // server-side response — document.cookie can't touch it from here.
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    window.location.href = "/login";
  };

  // All "Soon" locks have been removed — every item now links to its real
  // route. Pages that don't have a built page yet (Banners, Landing Page,
  // Manage Store, Analytics, Supplier, User & Permission, Affiliate, API,
  // Settings) will show Next.js's default 404 until those pages are built.
  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Products", href: "/products", icon: ShoppingBag },
    { name: "Categories", href: "/categories", icon: Layers },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Banners", href: "/banners", icon: ImageIcon },
    { name: "Promo Codes", href: "/promo-codes", icon: Tag },
    { name: "Landing Page", href: "/landing-page", icon: FileText },
    { name: "Manage Store", href: "/manage-store", icon: Store },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Supplier", href: "/supplier", icon: Truck },
    { name: "User & Permission", href: "/user-permission", icon: ShieldCheck },
    { name: "Affiliate", href: "/affiliate", icon: Handshake },
    { name: "API", href: "/api-settings", icon: Code2 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col antialiased sticky top-0 h-screen">

      {/* Top Logo Container */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-start h-18 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="OneCarta Logo"
          className="h-9 w-auto object-contain"
          style={{ maxWidth: "180px" }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.parentElement) {
              const textLogo = document.createElement('div');
              textLogo.className = "font-black text-xl text-indigo-950 tracking-tighter";
              textLogo.innerHTML = 'One<span class="text-indigo-600">carta</span>';
              e.currentTarget.parentElement.appendChild(textLogo);
            }
          }}
        />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 mt-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-tight transition-all group cursor-pointer ${
                isActive
                  ? "bg-[#e8f0fe] text-[#1a73e8]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={18} className={`shrink-0 ${isActive ? "text-[#1a73e8]" : "text-gray-400 group-hover:text-gray-600"}`} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Section */}
      <div className="p-4 border-t border-gray-100 relative shrink-0" ref={profileMenuRef}>
        {showProfileMenu && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden animate-fadeIn">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Settings size={16} className="text-gray-400" />
              Settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <User size={18} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-gray-900 truncate">Admin</p>
            <p className="text-[11px] text-gray-400 truncate">admin@onecarta.shop</p>
          </div>
          <ChevronUp size={16} className={`text-gray-400 shrink-0 transition-transform ${showProfileMenu ? "" : "rotate-180"}`} />
        </button>
      </div>
    </div>
  );
}