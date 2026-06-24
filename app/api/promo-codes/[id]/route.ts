import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

// PATCH: Update an existing promo code
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    // Make sure no OTHER promo code already uses this name
    const existing = await db.collection("promocodes").findOne({
      codeName: normalizedCode,
      _id: { $ne: new ObjectId(id) },
    });
    if (existing) {
      return NextResponse.json({ error: "A promo code with this name already exists" }, { status: 400 });
    }

    const updateFields = {
      codeName: normalizedCode,
      amount: amount || "",
      percentage: percentage || "",
      hasMaxDiscount: !!hasMaxDiscount,
      maxDiscountValue: hasMaxDiscount ? maxDiscountValue || "" : "",
      hasMinPurchase: !!hasMinPurchase,
      minPurchaseValue: hasMinPurchase ? minPurchaseValue || "" : "",
      expiryDate: expiryDate || "",
      updatedAt: new Date(),
    };

    await db.collection("promocodes").updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    const updated = await db.collection("promocodes").findOne({ _id: new ObjectId(id) });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update promo code" }, { status: 500 });
  }
}

// DELETE: Remove a promo code
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db("onecarta");

    await db.collection("promocodes").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete promo code" }, { status: 500 });
  }
}