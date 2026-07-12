import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

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

export async function POST(request: Request) {
  try {
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
      hasUsageLimit,
      usageLimitPerUser,
      freeDelivery,
      freeDeliveryScope,
      expiryDate,
    } = await request.json();

    if (!codeName || !codeName.trim()) {
      return NextResponse.json({ error: "Code name is required" }, { status: 400 });
    }

    if (discountType !== "flat" && discountType !== "upto") {
      return NextResponse.json({ error: "Discount type must be 'flat' or 'upto'" }, { status: 400 });
    }

    const normalizedCode = codeName.trim().toUpperCase();

    const existing = await db.collection("promocodes").findOne({ codeName: normalizedCode });
    if (existing) {
      return NextResponse.json({ error: "A promo code with this name already exists" }, { status: 400 });
    }

    // ---- discountType-specific validation ----
    if (discountType === "flat") {
      // Flat amount ekhon optional hote pare jodi freeDelivery enable kora thake —
      // "shudhu free delivery" type-er coupon banano jay bina discount ei.
      const hasFlatAmount = flatAmount && Number(flatAmount) > 0;
      if (!hasFlatAmount && !freeDelivery) {
        return NextResponse.json(
          { error: "Flat discount amount is required (or enable Free Delivery instead)" },
          { status: 400 }
        );
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

    if (hasUsageLimit && (!usageLimitPerUser || Number(usageLimitPerUser) <= 0)) {
      return NextResponse.json({ error: "Usage limit per customer must be a positive number" }, { status: 400 });
    }

    if (freeDelivery && !["dhaka", "all"].includes(freeDeliveryScope)) {
      return NextResponse.json(
        { error: "Please select where Free Delivery applies (Inside Dhaka or All Areas)" },
        { status: 400 }
      );
    }

    const newPromo = {
      codeName: normalizedCode,
      discountType,
      flatAmount: discountType === "flat" ? flatAmount || "" : "",
      basePercentage: discountType === "upto" ? basePercentage || "" : "",
      maxDiscountValue: discountType === "upto" ? maxDiscountValue || "" : "",
      hasMinPurchase: discountType === "upto" ? true : !!hasMinPurchase,
      minPurchaseValue:
        discountType === "upto" ? minPurchaseValue || "" : hasMinPurchase ? minPurchaseValue || "" : "",
      hasUsageLimit: !!hasUsageLimit,
      usageLimitPerUser: hasUsageLimit ? usageLimitPerUser || "" : "",
      // NEW — free delivery, independent of the discount above
      freeDelivery: !!freeDelivery,
      freeDeliveryScope: freeDelivery ? (freeDeliveryScope === "all" ? "all" : "dhaka") : null,
      expiryDate: expiryDate || "",
      isActive: true,
      createdAt: new Date(),
    };

    const result = await db.collection("promocodes").insertOne(newPromo);

    return NextResponse.json({ _id: result.insertedId, ...newPromo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create promo code" }, { status: 500 });
  }
}