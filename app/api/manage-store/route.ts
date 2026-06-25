import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

const SETTINGS_KEY = "global";

interface SectionStatus {
  configured: boolean;
  stat?: string;
}

// GET: Returns the live configuration status for every Manage Store section.
// - "adm-2" (Categories) and "adm-5" (Inventory) are computed live from real collections.
// - The rest are read from a singleton `storeSettings` document. If that document
//   doesn't exist yet, everything just defaults to "not configured" instead of crashing.
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const settingsDoc = await db.collection("storeSettings").findOne({ key: SETTINGS_KEY });

    const [categoriesCount, productsCount, lowStockCount] = await Promise.all([
      db.collection("categories").countDocuments(),
      db.collection("products").countDocuments(),
      db.collection("products").countDocuments({ stock: { $lte: 10 } }),
    ]);

    const sections: Record<string, SectionStatus> = {
      "adm-1": {
        configured: Boolean(settingsDoc?.storeProfile?.configured),
        stat: settingsDoc?.storeProfile?.name || undefined,
      },
      "adm-2": {
        configured: categoriesCount > 0,
        stat: `${categoriesCount} categor${categoriesCount === 1 ? "y" : "ies"}`,
      },
      "adm-3": {
        configured: Boolean(settingsDoc?.supplierSourcing?.connected),
        stat: settingsDoc?.supplierSourcing?.connected ? "Mohashagor connected" : undefined,
      },
      "adm-4": {
        configured: Boolean(settingsDoc?.pricing?.configured),
        stat:
          settingsDoc?.pricing?.markupPercent != null
            ? `${settingsDoc.pricing.markupPercent}% default markup`
            : undefined,
      },
      "adm-5": {
        configured: productsCount > 0,
        stat: `${productsCount} product${productsCount === 1 ? "" : "s"}${
          lowStockCount > 0 ? ` • ${lowStockCount} low stock` : ""
        }`,
      },
      "adm-6": {
        configured: Boolean(settingsDoc?.shipping?.configured),
        stat:
          settingsDoc?.shipping?.zonesCount != null
            ? `${settingsDoc.shipping.zonesCount} delivery zones`
            : undefined,
      },
      "adm-7": {
        configured: Boolean(settingsDoc?.paymentGateways?.active?.length),
        stat: settingsDoc?.paymentGateways?.active?.length
          ? `${settingsDoc.paymentGateways.active.length} active gateway${
              settingsDoc.paymentGateways.active.length === 1 ? "" : "s"
            }`
          : undefined,
      },
      "adm-8": {
        configured: Boolean(settingsDoc?.marketing?.pixelsConfigured?.length),
        stat: settingsDoc?.marketing?.pixelsConfigured?.length
          ? `${settingsDoc.marketing.pixelsConfigured.length} pixel(s) connected`
          : undefined,
      },
      "adm-9": {
        configured: Boolean(settingsDoc?.legalPolicies?.configured),
        stat: settingsDoc?.legalPolicies?.lastUpdated
          ? `Updated ${new Date(settingsDoc.legalPolicies.lastUpdated).toLocaleDateString()}`
          : undefined,
      },
    };

    return NextResponse.json({ sections }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch store configuration status" }, { status: 500 });
  }
}

// PATCH: Update one section's settings inside the singleton storeSettings document.
// Body: { section: "storeProfile" | "supplierSourcing" | "pricing" | "shipping" | "paymentGateways" | "marketing" | "legalPolicies", updates: {...} }
// A future settings sub-page (e.g. /manage-store/pricing) would call this on save,
// e.g. PATCH { section: "pricing", updates: { configured: true, markupPercent: 20 } }
export async function PATCH(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const body = await request.json();

    const { section, updates } = body;

    const allowedSections = [
      "storeProfile",
      "supplierSourcing",
      "pricing",
      "shipping",
      "paymentGateways",
      "marketing",
      "legalPolicies",
    ];

    if (!section || !allowedSections.includes(section) || !updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "A valid 'section' and 'updates' object are required" },
        { status: 400 }
      );
    }

    await db.collection("storeSettings").updateOne(
      { key: SETTINGS_KEY },
      { $set: { [section]: updates, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update store configuration" }, { status: 500 });
  }
}