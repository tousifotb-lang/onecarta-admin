"use client";

import React from "react";
import { 
  Store, Network, CloudDownload, BadgePercent, PackageCheck, Truck, ShieldCheck, BarChart3, Scale 
} from "lucide-react";

interface AdminOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isActiveBadge?: boolean;
}

export default function ManageStoreConfigurationPanel() {
  const adminManagementCards: AdminOption[] = [
    {
      id: "adm-1",
      title: "Store Profile & Identity",
      description: "Manage global storefront identities, official company logos, multi-platform brand credentials, and main operational store metadata setup.",
      icon: <Store size={26} className="text-indigo-600" />
    },
    {
      id: "adm-2",
      title: "Multi-Category Architecture",
      description: "Control core multi-level parent categories, sub-taxonomies, granular filtering layers, and global inventory attribute schemas.",
      icon: <Network size={26} className="text-indigo-600" />
    },
    {
      id: "adm-3",
      title: "Supplier Product Sourcing",
      description: "Configure third-party supplier API communication streams and secure connection endpoints to import remote catalog listings directly.",
      icon: <CloudDownload size={26} className="text-indigo-600" />
    },
    {
      id: "adm-4",
      title: "Global Pricing & Markup",
      description: "Define systemic automated profit margin rules, vat/tax parameters, and global markup multipliers for sourced automated supplier listings.",
      icon: <BadgePercent size={26} className="text-indigo-600" />
    },
    {
      id: "adm-5",
      title: "Inventory & Warehouse Guard",
      description: "Monitor integrated warehouse stocks, override specific product quantities, and track dynamic supplier live data connection logs.",
      icon: <PackageCheck size={26} className="text-indigo-600" />
    },
    {
      id: "adm-6",
      title: "Shipping & Delivery Engine",
      description: "Set up domestic shipping rate tables, automatic courier API allocations, and distinct regional logistics delivery coverage zones.",
      icon: <Truck size={26} className="text-indigo-600" />
    },
    {
      id: "adm-7",
      title: "Payment Gateways Hub",
      description: "Manage secure payment aggregator gateway pipelines, direct bank channels, and local mobile financial merchant wallets.",
      icon: <ShieldCheck size={26} className="text-indigo-600" />,
      isActiveBadge: true
    },
    {
      id: "adm-8",
      title: "Marketing & Pixel Integrations",
      description: "Inject and audit system-wide user tracking protocols including Facebook Pixel, TikTok Pixel, and Google Tag Manager core variables.",
      icon: <BarChart3 size={26} className="text-indigo-600" />
    },
    {
      id: "adm-9",
      title: "Legal Policies & Manifest",
      description: "Review and deploy updated official customer terms of service, strict privacy mandates, and return/refund standard operating workflows.",
      icon: <Scale size={26} className="text-indigo-600" />
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-6 sm:p-8 lg:p-10 select-none">
      
      {/* Upper Functional Header Block - Bold & Premium Spatial Geometry */}
      <div className="max-w-7xl mx-auto space-y-2 pb-8 border-b border-gray-200/60 mb-10">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight sm:text-3xl">Admin Operations Center</h1>
        <p className="text-sm sm:text-base text-gray-500 font-medium max-w-3xl leading-relaxed">
          Master administration console to authorize systemic core store updates, catalog infrastructures, financial gateways modules, and automated external integrations.
        </p>
      </div>

      {/* Grid Architecture Optimized for Visibility and Size Comfort */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {adminManagementCards.map((card) => (
          <div 
            key={card.id} 
            className="bg-white border border-gray-200 hover:border-indigo-500/50 rounded-2xl p-7 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer"
          >
            <div className="space-y-5">
              
              {/* Header Box Row Containing Enlarged Icon and Badges */}
              <div className="flex items-center justify-between">
                <div className="p-3.5 bg-indigo-50/80 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl transition-all duration-300 text-indigo-600 shrink-0 shadow-xs">
                  {card.icon}
                </div>
                {card.isActiveBadge && (
                  <span className="bg-emerald-500 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest select-none shadow-xs border border-emerald-400">
                    Active
                  </span>
                )}
              </div>
              
              {/* Text Block - Upgraded Size Properties to avoid cramped look */}
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors duration-200">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed tracking-normal group-hover:text-gray-500 transition-colors duration-200">
                  {card.description}
                </p>
              </div>

            </div>
          </div>
        ))}
      </div>

    </div>
  );
}