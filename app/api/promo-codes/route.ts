import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

// GET: Fetch all promo codes, newest first
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const promoCodes = await db.collection("promocodes").find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(promoCodes, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch promo codes" }, { status: 500 });
  }
}

// POST: Create a new promo code. Code name must be unique (case-insensitive).
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const {
      codeName,
      amount,
      percentage,
      hasMaxDiscount,
      maxDiscountValue,
      hasMinPurchase,
      minPurchaseValue,
      expiryDate,
    } = await request.json();

    if (!codeName || !codeName.trim()) {
      return NextResponse.json({ error: "Code name is required" }, { status: 400 });
    }

    const normalizedCode = codeName.trim().toUpperCase();

    const existing = await db.collection("promocodes").findOne({ codeName: normalizedCode });
    if (existing) {
      return NextResponse.json({ error: "A promo code with this name already exists" }, { status: 400 });
    }

    const newPromo = {
      codeName: normalizedCode,
      amount: amount || "",
      percentage: percentage || "",
      hasMaxDiscount: !!hasMaxDiscount,
      maxDiscountValue: hasMaxDiscount ? maxDiscountValue || "" : "",
      hasMinPurchase: !!hasMinPurchase,
      minPurchaseValue: hasMinPurchase ? minPurchaseValue || "" : "",
      expiryDate: expiryDate || "",
      isActive: true, // reserved for future checkout validation (expired/disabled codes)
      createdAt: new Date(),
    };

    const result = await db.collection("promocodes").insertOne(newPromo);

    return NextResponse.json({ _id: result.insertedId, ...newPromo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create promo code" }, { status: 500 });
  }
}