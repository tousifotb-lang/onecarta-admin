"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Search, Download, ChevronDown, ChevronLeft, ChevronRight,
  Users, ShoppingBag, Loader2
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  district: string;
  address: string;
  joinedDate: string; // ISO string from the backend
}

export default function CustomerManagerMatrix() {
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/customers");
        const data = await res.json();
        if (res.ok) setCustomers(data);
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone.includes(query)
    );
  });

  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirst, indexOfLast);

  const handleSelectAll = () => {
    if (selectedIds.length === currentCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentCustomers.map((c) => c.id));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const formatJoined = (isoDate: string) => {
    const d = new Date(isoDate);
    const date = d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
  };

  const handleExportToExcel = () => {
    const toExport = selectedIds.length > 0
      ? customers.filter((c) => selectedIds.includes(c.id))
      : filteredCustomers;

    if (toExport.length === 0) {
      alert("No customers to export.");
      return;
    }

    const rows = toExport.map((c) => {
      const { date, time } = formatJoined(c.joinedDate);
      return {
        "Name": c.name,
        "Email": c.email || "—",
        "Phone": c.phone,
        "Orders": c.ordersCount,
        "District": c.district || "—",
        "Address": c.address || "—",
        "Joined Date": date,
        "Joined Time": time,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 20 }, { wch: 26 }, { wch: 16 }, { wch: 10 },
      { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    const todayStamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `onecarta-customers-${todayStamp}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-4 sm:p-6 lg:p-8 select-none">

      <div className="flex items-center justify-between border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Customers</h1>
            <p className="text-sm text-gray-400 font-medium mt-0.5">{customers.length} total customer{customers.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportToExcel}
          className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
        >
          <Download size={16} className="text-gray-500" /> Export{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mt-6 space-y-5">

        <div className="space-y-3.5">
          <div className="relative flex items-center bg-white border border-gray-200 rounded-xl shadow-2xs max-w-md overflow-hidden">
            <Search size={17} className="absolute left-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, phone, or email"
              className="w-full pl-11 pr-4 py-3 text-sm font-medium bg-white text-gray-700 outline-none placeholder-gray-400"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-gray-400 font-semibold text-sm">
            <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading customers...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto pt-1">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 text-gray-400 uppercase tracking-wider border-b border-gray-100 text-xs font-semibold select-none">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === currentCustomers.length && currentCustomers.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Orders</th>
                    <th className="p-4">District</th>
                    <th className="p-4">Address</th>
                    <th className="p-4">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {currentCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold text-sm">
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    currentCustomers.map((customer) => {
                      const { date, time } = formatJoined(customer.joinedDate);
                      const isNew = customer.ordersCount === 1;
                      return (
                        <tr key={customer.id} className="group transition-colors hover:bg-gray-50/40">
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(customer.id)}
                              onChange={() => handleSelectRow(customer.id)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 font-bold text-sm flex items-center justify-center font-mono tracking-tight shrink-0 select-none">
                                {customer.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                <span className="font-semibold text-gray-900 text-sm block hover:text-indigo-600 cursor-pointer transition-colors">
                                  {customer.name}
                                </span>
                                <span className="text-xs text-gray-400 block font-normal">
                                  {customer.email || "—"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-800 font-semibold font-mono tracking-tight">
                            {customer.phone}
                          </td>
                          <td className="p-4">
                            <div className="space-y-1.5 items-start">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50/40 text-xs font-bold text-blue-600">
                                <ShoppingBag size={12} className="shrink-0" />
                                <span>{customer.ordersCount} order{customer.ordersCount === 1 ? "" : "s"}</span>
                              </div>
                              {isNew && (
                                <span className="text-xs text-blue-500 font-semibold block pl-1 tracking-tight">
                                  New customer
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-gray-400 font-medium">
                            {customer.district || "—"}
                          </td>
                          <td className="p-4 text-gray-700 font-medium">
                            {customer.address || "—"}
                          </td>
                          <td className="p-4">
                            <div className="text-gray-800 font-medium leading-relaxed">
                              <span className="block">{date}</span>
                              <span className="block text-xs text-gray-400 font-mono mt-0.5">{time}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 px-2 text-sm text-gray-500 font-medium border-t border-gray-50 select-none">
              <div className="flex items-center gap-2">
                <span>Showing {totalItems > 0 ? indexOfFirst + 1 : 0}-{Math.min(indexOfLast, totalItems)} of {totalItems}</span>
                <div className="relative inline-block">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 focus:border-indigo-500 outline-none text-gray-700 cursor-pointer text-sm font-semibold transition-all"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
                <span>per page</span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white font-semibold text-gray-700 text-center shadow-2xs">
                  {currentPage}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}

      </div>

    </div>
  );
}