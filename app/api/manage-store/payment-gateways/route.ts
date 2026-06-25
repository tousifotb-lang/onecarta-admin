// Place this file at: app/api/manage-store/payment-gateways/route.ts

import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

const SETTINGS_KEY = "global";

/* Default shape — every gateway always has a base record in the API response */
const DEFAULTS: Record<string, Record<string, string | boolean>> = {
  cod:        { enabled: false },
  bkash:      { enabled: false, appKey: "", appSecret: "", username: "", password: "", mode: "sandbox" },
  nagad:      { enabled: false, merchantId: "", merchantNumber: "", publicKey: "", privateKey: "", mode: "sandbox" },
  rocket:     { enabled: false, merchantNumber: "", username: "", password: "", mode: "sandbox" },
  upay:       { enabled: false, merchantId: "", merchantKey: "", mode: "sandbox" },
  "self-mfs": { enabled: false, provider: "bKash", accountNumber: "", accountType: "Personal", instructions: "" },
  sslcommerz: { enabled: false, storeId: "", storePassword: "", mode: "sandbox" },
  aamarpay:   { enabled: false, storeId: "", signatureKey: "", mode: "sandbox" },
};

/* ── GET ────────────────────────────────────────────────────────────────────
   Returns all gateway settings merged with defaults.
   Called by: app/manage-store/payment-gateways/page.tsx on mount
──────────────────────────────────────────────────────────────────────────── */
export async function GET() {
  try {
    const client = await clientPromise;
    const db     = client.db("onecarta");

    const doc   = await db.collection("storeSettings").findOne({ key: SETTINGS_KEY });
    const saved = (doc?.paymentGateways?.gateways ?? {}) as Record<string, Record<string, string | boolean>>;

    // Deep-merge: saved values win over defaults so existing config is preserved
    const gateways: Record<string, Record<string, string | boolean>> = {};
    for (const id of Object.keys(DEFAULTS)) {
      gateways[id] = { ...DEFAULTS[id], ...(saved[id] ?? {}) };
    }

    return NextResponse.json(
      {
        gateways,
        message: (doc?.paymentGateways?.message as string) ?? "",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[payment-gateways GET]", err);
    return NextResponse.json({ error: "Failed to load payment gateway settings" }, { status: 500 });
  }
}

/* ── PATCH ──────────────────────────────────────────────────────────────────
   Saves all gateway settings + message in one shot.
   Body: { gateways: Record<string, GatewayState>, message?: string }
   Also keeps paymentGateways.active[] in sync so the manage-store
   overview card (adm-7) in app/api/manage-store/route.ts stays accurate.
──────────────────────────────────────────────────────────────────────────── */
export async function PATCH(request: Request) {
  try {
    const client = await clientPromise;
    const db     = client.db("onecarta");

    const body = (await request.json()) as {
      gateways: Record<string, Record<string, string | boolean>>;
      message?: string;
    };

    const { gateways, message } = body;

    if (!gateways || typeof gateways !== "object") {
      return NextResponse.json({ error: "Invalid payload — 'gateways' object is required" }, { status: 400 });
    }

    // Compute the active array — used by the manage-store overview route
    const active = Object.entries(gateways)
      .filter(([, v]) => Boolean(v.enabled))
      .map(([id]) => id);

    await db.collection("storeSettings").updateOne(
      { key: SETTINGS_KEY },
      {
        $set: {
          "paymentGateways.gateways": gateways,
          "paymentGateways.message":  message ?? "",
          "paymentGateways.active":   active,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, active }, { status: 200 });
  } catch (err) {
    console.error("[payment-gateways PATCH]", err);
    return NextResponse.json({ error: "Failed to save payment gateway settings" }, { status: 500 });
  }
}