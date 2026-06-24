"use client";

import React, { useState } from "react";
import { UserPlus, Users, Trash2, X, ShieldAlert, KeyRound, UserCheck, Mail } from "lucide-react";

interface UserNode {
  id: string;
  name: string;
  identity: string;
  role: "Platform Owner" | "Shop Manager" | "Shop Staff";
  isCurrentUser?: boolean;
}

export default function UsersPermissionsManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [identityInput, setIdentityInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("Shop Manager");

  const [systemUsers, setSystemUsers] = useState<UserNode[]>([
    {
      id: "usr-master",
      name: "Md Tousif Rahman",
      identity: "othobadesign@gmail.com",
      role: "Platform Owner",
      isCurrentUser: true
    }
  ]);

  const handleAddNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityInput.trim()) return;

    const inferredName = identityInput.includes("@") 
      ? identityInput.split("@")[0] 
      : `Staff-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUserNode: UserNode = {
      id: `usr-${Date.now()}`,
      name: inferredName,
      identity: identityInput.trim(),
      role: selectedRole as any
    };

    setSystemUsers(prev => [...prev, newUserNode]);
    setIdentityInput("");
    setSelectedRole("Shop Manager");
    setIsModalOpen(false);
  };

  const handleRemoveUser = (id: string) => {
    if (confirm("Are you sure you want to revoke access permissions for this account?")) {
      setSystemUsers(prev => prev.filter(user => user.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 antialiased font-sans p-6 sm:p-8 lg:p-10 select-none w-full">
      <div className="max-w-(--size-xl) mx-auto w-full space-y-8">
        
        {/* Top Operational Header Module */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs w-full">
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Manage Users & Permissions</h1>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">
              Authorize trusted access, assign structural channel workspace management privileges, and view system operator logs.
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-lg hover:shadow-indigo-600/10 transition-all cursor-pointer h-fit shrink-0"
          >
            <UserPlus size={18} /> Add User
          </button>
        </div>

        {/* Two-Column Grid Framework to remove side whitespace and fill space completely */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full items-start">
          
          {/* Left Side: Summary and Insights Panel Component */}
          <div className="lg:col-span-1 space-y-6 w-full">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={16} className="text-indigo-600" /> Security Overview
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Users</span>
                  <p className="text-2xl font-black text-gray-900">{systemUsers.length}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Active Roles</span>
                  <p className="text-2xl font-black text-indigo-600">3</p>
                </div>
              </div>

              <div className="space-y-3.5 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-gray-900 animate-pulse" />
                  <span>Platform Owner: Full Access Control</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Shop Manager: Catalog & Orders Matrix</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Shop Staff: Fulfillment Operations Only</span>
                </div>
              </div>
            </div>

            <div className="bg-linear-to-br from-indigo-900 to-indigo-950 rounded-3xl p-6 text-white space-y-4 shadow-sm hidden lg:block">
              <KeyRound size={28} className="text-indigo-400" />
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold tracking-tight">Need granular access?</h4>
                <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">
                  Staff logs are recorded transparently. Restricting inactive tokens improves backend API endpoint security limits.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Main Interactive Users Management List Component */}
          <div className="lg:col-span-2 space-y-4 w-full">
            {systemUsers.map((user) => (
              <div 
                key={user.id} 
                className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xs transition-all hover:border-gray-300 w-full"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 bg-indigo-50/50 border border-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-3xs">
                    <UserCheck size={24} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2 truncate">
                      {user.name} 
                      {user.isCurrentUser && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">You</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 font-medium truncate select-all">
                      <Mail size={12} className="text-gray-300" />
                      <span>{user.identity}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-50">
                  <span className="bg-gray-900 text-white font-black text-[11px] px-4 py-2 rounded-xl uppercase tracking-wider shadow-3xs select-none">
                    {user.role}
                  </span>
                  
                  <button
                    type="button"
                    disabled={user.isCurrentUser}
                    onClick={() => handleRemoveUser(user.id)}
                    className="p-3 border border-gray-100 bg-white hover:bg-red-50 text-gray-300 hover:text-red-600 rounded-xl transition-all duration-200 disabled:opacity-20 disabled:hover:bg-white disabled:hover:text-gray-300 cursor-pointer shadow-3xs"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Interactive Add User Modal Dialog Viewbox */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 space-y-5 relative animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Add shop users</h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewUser} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Email or Phone Number</label>
                <input 
                  required
                  type="text" 
                  value={identityInput}
                  onChange={(e) => setIdentityInput(e.target.value)}
                  placeholder="name@example.com or 017XXXXXXXX"
                  className="w-full border border-gray-200 px-4 py-3 rounded-xl text-sm bg-white text-gray-800 outline-none focus:border-indigo-500 font-medium placeholder:text-gray-300 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Select Role</label>
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 rounded-xl text-sm bg-white text-gray-800 outline-none focus:border-indigo-500 font-bold transition-all appearance-none cursor-pointer"
                  >
                    <option value="Shop Manager">Shop Manager</option>
                    <option value="Shop Staff">Shop Staff</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold text-xs">▼</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Add User
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </div>
  );
}