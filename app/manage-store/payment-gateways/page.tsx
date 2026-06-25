// Place this file at: app/manage-store/payment-gateways/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ChevronDown, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

/* ──────────────────────────── Types ──────────────────────────────────────── */

type FieldType = "text" | "password" | "select" | "textarea";

interface ConfigField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  wide?: boolean; // spans both grid columns on sm+
}

interface GatewayDef {
  id: string;
  label: string;
  description: string;
  configFields: ConfigField[];
}

interface GatewayState {
  enabled: boolean;
  [key: string]: string | boolean;
}

/* ──────────────────────── Gateway definitions ─────────────────────────────── */

const GATEWAYS: GatewayDef[] = [
  {
    id: "cod",
    label: "Cash On Delivery",
    description: "Accept cash payments on delivery",
    configFields: [],
  },
  {
    id: "bkash",
    label: "bKash",
    description: "Configure bKash merchant credentials",
    configFields: [
      { key: "appKey",    label: "App Key",    type: "text",     placeholder: "Enter bKash App Key" },
      { key: "appSecret", label: "App Secret", type: "password", placeholder: "Enter bKash App Secret" },
      { key: "username",  label: "Username",   type: "text",     placeholder: "Enter bKash Username" },
      { key: "password",  label: "Password",   type: "password", placeholder: "Enter bKash Password" },
      { key: "mode",      label: "Mode",       type: "select",   options: ["sandbox", "live"] },
    ],
  },
  {
    id: "nagad",
    label: "Nagad",
    description: "Configure Nagad merchant credentials",
    configFields: [
      { key: "merchantId",     label: "Merchant ID",     type: "text",     placeholder: "Enter Nagad Merchant ID" },
      { key: "merchantNumber", label: "Merchant Number", type: "text",     placeholder: "e.g. 01XXXXXXXXX" },
      { key: "publicKey",      label: "Public Key",      type: "textarea", placeholder: "PEM format public key",  wide: true },
      { key: "privateKey",     label: "Private Key",     type: "textarea", placeholder: "PEM format private key", wide: true },
      { key: "mode",           label: "Mode",            type: "select",   options: ["sandbox", "live"] },
    ],
  },
  {
    id: "rocket",
    label: "Rocket",
    description: "Configure Rocket (DBBL Mobile Banking) credentials",
    configFields: [
      { key: "merchantNumber", label: "Merchant Number", type: "text",     placeholder: "Enter Rocket Merchant Number" },
      { key: "username",       label: "Username",        type: "text",     placeholder: "Enter Rocket Username" },
      { key: "password",       label: "Password",        type: "password", placeholder: "Enter Rocket Password" },
      { key: "mode",           label: "Mode",            type: "select",   options: ["sandbox", "live"] },
    ],
  },
  {
    id: "upay",
    label: "Upay",
    description: "Configure Upay merchant credentials",
    configFields: [
      { key: "merchantId",  label: "Merchant ID",  type: "text",     placeholder: "Enter Upay Merchant ID" },
      { key: "merchantKey", label: "Merchant Key", type: "password", placeholder: "Enter Upay Merchant Key" },
      { key: "mode",        label: "Mode",         type: "select",   options: ["sandbox", "live"] },
    ],
  },
  {
    id: "self-mfs",
    label: "Self MFS",
    description: "Accept payments directly to your own MFS account",
    configFields: [
      { key: "provider",      label: "MFS Provider",         type: "select",   options: ["bKash", "Nagad", "Rocket", "Upay"] },
      { key: "accountNumber", label: "Account Number",       type: "text",     placeholder: "e.g. 01XXXXXXXXX" },
      { key: "accountType",   label: "Account Type",         type: "select",   options: ["Personal", "Agent", "Merchant"] },
      { key: "instructions",  label: "Customer Instructions", type: "textarea", placeholder: "e.g. Send money to this number and mention your Order ID as reference", wide: true },
    ],
  },
  {
    id: "sslcommerz",
    label: "SSLCommerz",
    description: "Configure SSLCommerz payment gateway credentials",
    configFields: [
      { key: "storeId",       label: "Store ID",       type: "text",     placeholder: "Enter SSLCommerz Store ID" },
      { key: "storePassword", label: "Store Password", type: "password", placeholder: "Enter SSLCommerz Store Password" },
      { key: "mode",          label: "Mode",           type: "select",   options: ["sandbox", "live"] },
    ],
  },
  {
    id: "aamarpay",
    label: "AamarPay",
    description: "Configure AamarPay payment gateway credentials",
    configFields: [
      { key: "storeId",      label: "Store ID",      type: "text",     placeholder: "Enter AamarPay Store ID" },
      { key: "signatureKey", label: "Signature Key", type: "password", placeholder: "Enter AamarPay Signature Key" },
      { key: "mode",         label: "Mode",          type: "select",   options: ["sandbox", "live"] },
    ],
  },
];

const buildInitialState = (): Record<string, GatewayState> =>
  Object.fromEntries(GATEWAYS.map((g) => [g.id, { enabled: false }]));

/* ────────────────────────── Gateway Icon ─────────────────────────────────── */
// Reads from public/payment/{id}.png — add your PNG files there.
// Falls back to a two-letter badge if the image is missing.

function GatewayIcon({ id, label }: { id: string; label: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 font-black text-xs select-none shrink-0">
        {label.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/payment/${id}.png`}
        alt={label}
        width={40}
        height={40}
        className="object-contain w-10 h-10"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

/* ──────────────────────────── Toggle ─────────────────────────────────────── */

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      aria-label={on ? "Disable" : "Enable"}
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${on ? "bg-indigo-600" : "bg-gray-300"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

/* ────────────────────────── Config Field ─────────────────────────────────── */

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: string;
  onChange: (k: string, v: string) => void;
}) {
  const [show, setShow] = useState(false);

  const base =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white transition-colors " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";

  const label = (
    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
      {field.label}
    </label>
  );

  if (field.type === "select") {
    return (
      <div>
        {label}
        <select
          value={value || field.options?.[0] || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={base}
        >
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o.charAt(0).toUpperCase() + o.slice(1)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`${base} resize-none font-mono text-xs`}
        />
      </div>
    );
  }

  const isPass = field.type === "password";
  return (
    <div>
      {label}
      <div className="relative">
        <input
          type={isPass && !show ? "password" : "text"}
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className={`${base} ${isPass ? "pr-10" : ""}`}
        />
        {isPass && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── Gateway Card ─────────────────────────────────── */

function GatewayCard({
  def,
  state,
  onToggle,
  onField,
}: {
  def: GatewayDef;
  state: GatewayState;
  onToggle: (id: string, v: boolean) => void;
  onField: (id: string, key: string, val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasConfig = def.configFields.length > 0;

  const handleToggle = (v: boolean) => {
    onToggle(def.id, v);
    if (v && hasConfig) setOpen(true);
    if (!v) setOpen(false);
  };

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden transition-all duration-200 border ${
        state.enabled
          ? "border-indigo-200 shadow-sm shadow-indigo-50"
          : "border-gray-200"
      }`}
    >
      {/* ── Row ── */}
      <div
        className={`flex items-center gap-4 p-4 sm:p-5 transition-colors ${
          hasConfig ? "cursor-pointer hover:bg-gray-50/70" : ""
        }`}
        onClick={() => hasConfig && setOpen((p) => !p)}
      >
        <GatewayIcon id={def.id} label={def.label} />

        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-sm text-gray-900 leading-tight">{def.label}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{def.description}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {state.enabled && (
            <span className="hidden sm:inline text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-widest select-none">
              Active
            </span>
          )}
          <Toggle on={Boolean(state.enabled)} onChange={handleToggle} />
          {hasConfig && (
            <ChevronDown
              size={15}
              className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </div>

      {/* ── Config panel ── */}
      {hasConfig && open && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
            Configuration
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {def.configFields.map((f) => (
              <div key={f.key} className={f.wide ? "sm:col-span-2" : ""}>
                <FieldInput
                  field={f}
                  value={String(state[f.key] ?? "")}
                  onChange={(k, v) => onField(def.id, k, v)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────── Page ──────────────────────────────────────── */

export default function PaymentGatewaysPage() {
  const [gateways, setGateways] = useState<Record<string, GatewayState>>(buildInitialState);
  const [message, setMessage] = useState("");
  const [loading, setLoading]  = useState(true);
  const [saving, setSaving]    = useState(false);
  const [status, setStatus]    = useState<"idle" | "ok" | "err">("idle");

  /* Load */
  useEffect(() => {
    fetch("/api/manage-store/payment-gateways")
      .then((r) => r.json())
      .then((data) => {
        setGateways((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(next)) {
            if (data.gateways?.[id]) next[id] = { ...next[id], ...data.gateways[id] };
          }
          return next;
        });
        setMessage(data.message || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback((id: string, v: boolean) => {
    setGateways((p) => ({ ...p, [id]: { ...p[id], enabled: v } }));
  }, []);

  const handleField = useCallback((id: string, key: string, val: string) => {
    setGateways((p) => ({ ...p, [id]: { ...p[id], [key]: val } }));
  }, []);

  /* Save */
  const save = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const r = await fetch("/api/manage-store/payment-gateways", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateways, message }),
      });
      setStatus(r.ok ? "ok" : "err");
    } catch {
      setStatus("err");
    } finally {
      setSaving(false);
      setTimeout(() => setStatus("idle"), 3500);
    }
  };

  const activeCount = Object.values(gateways).filter((g) => g.enabled).length;

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 sm:p-8 lg:p-10 select-none">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/manage-store"
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Payment Gateway
            </h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {loading
                ? "Loading…"
                : `${activeCount} active gateway${activeCount !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* ── Section label ── */}
        <div className="mb-5 pb-4 border-b border-gray-200/70">
          <h2 className="text-lg font-black text-gray-900">Payment Gateways</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Enable and configure your preferred payment methods
          </p>
        </div>

        {/* ── Gateway list ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-indigo-400" size={28} />
          </div>
        ) : (
          <div className="space-y-3">
            {GATEWAYS.map((def) => (
              <GatewayCard
                key={def.id}
                def={def}
                state={gateways[def.id]}
                onToggle={handleToggle}
                onField={handleField}
              />
            ))}
          </div>
        )}

        {/* ── Message note ── */}
        <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-sm font-extrabold text-gray-800">
              Payment process message note
            </label>
            <span className="text-[11px] text-gray-400 font-medium tabular-nums">
              {message.length}/255
            </span>
          </div>
          <textarea
            rows={4}
            value={message}
            onChange={(e) =>
              e.target.value.length <= 255 && setMessage(e.target.value)
            }
            placeholder="Add a custom message for your customers about the payment process…"
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none text-gray-700 placeholder:text-gray-300 transition-colors"
          />
        </div>

        {/* ── Footer / Save ── */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="text-sm font-semibold min-h-[20px]">
            {status === "ok" && (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 size={15} /> Settings saved successfully
              </span>
            )}
            {status === "err" && (
              <span className="flex items-center gap-1.5 text-red-500">
                <XCircle size={15} /> Failed to save. Please try again.
              </span>
            )}
          </div>

          <button
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors shadow-sm shadow-indigo-200 shrink-0"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving…" : "Update Payment Info"}
          </button>
        </div>

      </div>
    </div>
  );
}