"use client";

import React, { useState } from "react";
import { Terminal, Plus, RefreshCw, Layers, Copy, Check, Trash2, Globe, ShieldCheck } from "lucide-react";

interface SupplierConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  secretKey: string;
  lastSynced: string;
}

export default function ApiSettingsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<Record<string, string>>({});

  // Dynamic Repository State - Prepopulated with Mohasagor as index 0
  const [suppliers, setSuppliers] = useState<SupplierConfig[]>([
    {
      id: "sup-1",
      name: "Mohasagor Dropshipping",
      endpoint: "https://mohasagor.com.bd/api/reseller/product",
      apiKey: "A8niclztH9JtzS4t",
      secretKey: "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8",
      lastSynced: "Never synced"
    }
  ]);

  // Modal / Form Field Inputs Buffer States
  const [supplierName, setSupplierName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || !endpoint || !apiKey) return;

    const newSupplier: SupplierConfig = {
      id: `sup-${Date.now()}`,
      name: supplierName,
      endpoint: endpoint.trim(),
      apiKey: apiKey.trim(),
      secretKey: secretKey.trim(),
      lastSynced: "Never synced"
    };

    setSuppliers(prev => [...prev, newSupplier]);
    setSupplierName("");
    setEndpoint("");
    setApiKey("");
    setSecretKey("");
    setShowAddForm(false);
  };

  const handleTriggerDynamicSync = async (supplier: SupplierConfig) => {
    setActiveSyncId(supplier.id);
    setSyncLogs(prev => ({ ...prev, [supplier.id]: `Initializing dynamic ingestion stream for ${supplier.name}...` }));

    try {
      const res = await fetch("/api/sync-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: supplier.endpoint,
          apiKey: supplier.apiKey,
          secretKey: supplier.secretKey
        })
      });

      const data = await res.json();
      const timestamp = new Date().toLocaleTimeString();

      if (res.ok) {
        setSyncLogs(prev => ({ ...prev, [supplier.id]: `[${timestamp}] Success! Synchronized ${data.count || 0} active products.` }));
        setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, lastSynced: new Date().toLocaleString() } : s));
      } else {
        setSyncLogs(prev => ({ ...prev, [supplier.id]: `[${timestamp}] Integration error: ${data.error || "Bad Gateway"}` }));
      }
    } catch (err) {
      setSyncLogs(prev => ({ ...prev, [supplier.id]: "Network connection failure across target repository pipeline." }));
    } finally {
      setActiveSyncId(null);
    }
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm("Remove this supplier configuration endpoint?")) {
      setSuppliers(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-4 sm:p-6 lg:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Dynamic Upper Layout Header Component Frame */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Terminal size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">Dynamic Supplier Sync Manager</h1>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Connect and aggregate automated product feeds from multiple endpoints</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={14} /> {showAddForm ? "Close Form" : "Connect New Supplier"}
          </button>
        </div>

        {/* Dynamic Supplier Ingestion Creation Form Wrapper */}
        {showAddForm && (
          <form onSubmit={handleCreateSupplier} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-3xs grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideDown">
            <div className="md:col-span-2"><h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">New Upstream Configurations</h3></div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Supplier Platform Name</label>
              <input required type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Enter Supplier Platform Name" className="w-full border border-gray-200 px-3 py-2.5 rounded-xl text-xs bg-white text-gray-800 outline-none focus:border-indigo-500 font-medium" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Product API Endpoint URL</label>
              <input required type="url" value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://domain.com/api/products" className="w-full border border-gray-200 px-3 py-2.5 rounded-xl text-xs bg-white text-gray-800 outline-none focus:border-indigo-500 font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Provided API Key</label>
              <input required type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter client api key token" className="w-full border border-gray-200 px-3 py-2.5 rounded-xl text-xs bg-white text-gray-800 outline-none focus:border-indigo-500 font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Secret Key / Token (Optional)</label>
              <input type="text" value={secretKey} onChange={e => setSecretKey(e.target.value)} placeholder="Enter secret auth validation checksum" className="w-full border border-gray-200 px-3 py-2.5 rounded-xl text-xs bg-white text-gray-800 outline-none focus:border-indigo-500 font-mono" />
            </div>
            <div className="md:col-span-2 flex justify-end pt-2">
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer">Save & Registry Endpoint</button>
            </div>
          </form>
        )}

        {/* Supplier Iteration Grid Stream Loops */}
        <div className="space-y-4">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white border border-gray-200 rounded-2xl shadow-3xs p-5 space-y-4 transition-all hover:border-gray-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 flex items-center justify-center shadow-3xs"><Globe size={16} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 tracking-tight">{supplier.name}</h4>
                    <span className="text-[10px] font-mono font-medium text-gray-400 block mt-0.5">Last Sync Operation: {supplier.lastSynced}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activeSyncId === supplier.id}
                    onClick={() => handleTriggerDynamicSync(supplier)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <Layers size={13} className={activeSyncId === supplier.id ? "animate-spin" : ""} />
                    {activeSyncId === supplier.id ? "Syncing Feed..." : "Sync Channel"}
                  </button>
                  <button onClick={() => handleDeleteSupplier(supplier.id)} type="button" className="p-2 border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-all cursor-pointer"><Trash2 size={14} /></button>
                </div>
              </div>

              {/* Logger shell viewport console line */}
              {syncLogs[supplier.id] && (
                <div className="p-3 bg-gray-900 text-gray-200 rounded-xl text-[11px] font-mono tracking-tight animate-fadeIn">
                  &gt; {syncLogs[supplier.id]}
                </div>
              )}

              {/* Credentials Sub-Matrix parameters viewport framework */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Target Destination Endpoint Route</span>
                  <div className="bg-gray-50/50 border border-gray-200 px-3 py-2 rounded-lg text-xs font-mono font-bold text-gray-600 truncate select-all">{supplier.endpoint}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">API Client Token</span>
                    <div className="bg-gray-50/50 border border-gray-200 px-3 py-2 rounded-lg text-xs font-mono text-gray-500 truncate select-none">••••••••••••••••</div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Secret Context</span>
                    <div className="bg-gray-50/50 border border-gray-200 px-3 py-2 rounded-lg text-xs font-mono text-gray-500 truncate select-none">••••••••••••••••</div>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}