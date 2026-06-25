// Place this file at: app/manage-store/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Store, Network, CloudDownload, BadgePercent, PackageCheck, Truck, ShieldCheck, BarChart3, Scale 
} from "lucide-react";

interface SectionStatus {
  configured: boolean;
  stat?: string;
}

interface AdminOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

export default function ManageStoreConfigurationPanel() {
  const [statusMap, setStatusMap] = useState<Record<string, SectionStatus>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/manage-store");
        const data = await res.json();
        if (res.ok) setStatusMap(data.sections || {});
      } catch (err) {
        console.error("Failed to load manage-store status:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStatus();
  }, []);

  const adminManagementCards: AdminOption[] = [
    {
      id: "adm-1",
      title: "Store Profile & Identity",
      description: "Manage global storefront identities, official company logos, multi-platform brand credentials, and main operational store metadata setup.",
      icon: <Store size={26} className="text-indigo-600" />,
      href: "/manage-store/store-profile",
    },
    {
      id: "adm-2",
      title: "Multi-Category Architecture",
      description: "Control core multi-level parent categories, sub-taxonomies, granular filtering layers, and global inventory attribute schemas.",
      icon: <Network size={26} className="text-indigo-600" />,
      href: "/categories",
    },
    {
      id: "adm-3",
      title: "Supplier Product Sourcing",
      description: "Configure third-party supplier API communication streams and secure connection endpoints to import remote catalog listings directly.",
      icon: <CloudDownload size={26} className="text-indigo-600" />,
      href: "/supplier",
    },
    {
      id: "adm-4",
      title: "Global Pricing & Markup",
      description: "Define systemic automated profit margin rules, vat/tax parameters, and global markup multipliers for sourced automated supplier listings.",
      icon: <BadgePercent size={26} className="text-indigo-600" />,
      href: "/manage-store/pricing",
    },
    {
      id: "adm-5",
      title: "Inventory & Warehouse Guard",
      description: "Monitor integrated warehouse stocks, override specific product quantities, and track dynamic supplier live data connection logs.",
      icon: <PackageCheck size={26} className="text-indigo-600" />,
      href: "/products",
    },
    {
      id: "adm-6",
      title: "Shipping & Delivery Engine",
      description: "Set up domestic shipping rate tables, automatic courier API allocations, and distinct regional logistics delivery coverage zones.",
      icon: <Truck size={26} className="text-indigo-600" />,
      href: "/manage-store/shipping",
    },
    {
      id: "adm-7",
      title: "Payment Gateways Hub",
      description: "Manage secure payment aggregator gateway pipelines, direct bank channels, and local mobile financial merchant wallets.",
      icon: <ShieldCheck size={26} className="text-indigo-600" />,
      href: "/manage-store/payment-gateways",
    },
    {
      id: "adm-8",
      title: "Marketing & Pixel Integrations",
      description: "Inject and audit system-wide user tracking protocols including Facebook Pixel, TikTok Pixel, and Google Tag Manager core variables.",
      icon: <BarChart3 size={26} className="text-indigo-600" />,
      href: "/manage-store/marketing",
    },
    {
      id: "adm-9",
      title: "Legal Policies & Manifest",
      description: "Review and deploy updated official customer terms of service, strict privacy mandates, and return/refund standard operating workflows.",
      icon: <Scale size={26} className="text-indigo-600" />,
      href: "/manage-store/legal-policies",
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-6 sm:p-8 select-none">

      {/* Header */}
      <div className="w-full space-y-2 pb-8 border-b border-gray-200/60 mb-10">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Admin Operations Center</h1>
        <p className="text-sm sm:text-base text-gray-500 font-medium max-w-3xl leading-relaxed">
          Master administration console to authorize systemic core store updates, catalog infrastructures, financial gateways modules, and automated external integrations.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {adminManagementCards.map((card) => {
          const status = statusMap[card.id];

          return (
            <Link
              key={card.id}
              href={card.href}
              className="bg-white border border-gray-200 hover:border-indigo-500/50 rounded-2xl p-7 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer"
            >
              <div className="space-y-5">

                {/* Icon + Badge row */}
                <div className="flex items-center justify-between">
                  <div className="p-3.5 bg-indigo-50/80 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl transition-all duration-300 text-indigo-600 shrink-0 shadow-xs">
                    {card.icon}
                  </div>

                  {isLoading ? (
                    <span className="w-20 h-5 rounded-full bg-gray-100 animate-pulse" />
                  ) : status?.configured ? (
                    <span className="bg-emerald-500 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest select-none shadow-xs border border-emerald-400">
                      Active
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-400 font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest select-none border border-gray-200">
                      Not Configured
                    </span>
                  )}
                </div>

                {/* Text */}
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors duration-200">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed tracking-normal group-hover:text-gray-500 transition-colors duration-200">
                    {card.description}
                  </p>
                  {!isLoading && status?.stat && (
                    <p className="text-xs font-bold text-indigo-500 pt-1">{status.stat}</p>
                  )}
                </div>

              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
}