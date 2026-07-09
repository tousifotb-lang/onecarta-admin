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
      discountType,
      flatAmount,
      basePercentage,
      maxDiscountValue,
      hasMinPurchase,
      minPurchaseValue,
      expiryDate,
    } = await request.json();

    if (!codeName || !codeName.trim()) {
      return NextResponse.json({ error: "Code name is required" }, { status: 400 });
    }

    if (discountType !== "flat" && discountType !== "upto") {
      return NextResponse.json({ error: "Discount type must be 'flat' or 'upto'" }, { status: 400 });
    }

    const normalizedCode = codeName.trim().toUpperCase();

    const existing = await db.collection("promocodes").findOne({
      codeName: normalizedCode,
      _id: { $ne: new ObjectId(id) },
    });
    if (existing) {
      return NextResponse.json({ error: "A promo code with this name already exists" }, { status: 400 });
    }

    if (discountType === "flat") {
      if (!flatAmount || Number(flatAmount) <= 0) {
        return NextResponse.json({ error: "Flat discount amount is required" }, { status: 400 });
      }
      if (hasMinPurchase && (!minPurchaseValue || Number(minPurchaseValue) <= 0)) {
        return NextResponse.json({ error: "Minimum purchase value is required" }, { status: 400 });
      }
    } else {
      if (!minPurchaseValue || Number(minPurchaseValue) <= 0) {
        return NextResponse.json({ error: "Minimum purchase value is required for 'upto' discounts" }, { status: 400 });
      }
      if (!basePercentage || Number(basePercentage) <= 0) {
        return NextResponse.json({ error: "Base percentage is required for 'upto' discounts" }, { status: 400 });
      }
      if (!maxDiscountValue || Number(maxDiscountValue) <= 0) {
        return NextResponse.json({ error: "Max discount value is required for 'upto' discounts" }, { status: 400 });
      }
    }

    const updateFields = {
      codeName: normalizedCode,
      discountType,
      flatAmount: discountType === "flat" ? flatAmount || "" : "",
      basePercentage: discountType === "upto" ? basePercentage || "" : "",
      maxDiscountValue: discountType === "upto" ? maxDiscountValue || "" : "",
      hasMinPurchase: discountType === "upto" ? true : !!hasMinPurchase,
      minPurchaseValue:
        discountType === "upto" ? minPurchaseValue || "" : hasMinPurchase ? minPurchaseValue || "" : "",
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