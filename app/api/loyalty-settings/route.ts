import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

// GET: current loyalty points settings (sane defaults if none saved yet)
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const doc = await db.collection("loyaltysettings").findOne({});

    return NextResponse.json({
      isActive: doc?.isActive ?? true,
      earnRateAmount: doc?.earnRateAmount ?? 100,
      earnRatePoints: doc?.earnRatePoints ?? 1,
      redeemPointsAmount: doc?.redeemPointsAmount ?? 100,
      redeemValueAmount: doc?.redeemValueAmount ?? 10,
      minRedeemPoints: doc?.minRedeemPoints ?? 100,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch loyalty settings" }, { status: 500 });
  }
}

// PATCH: update loyalty points settings (upsert — creates the singleton
// document on first save)
export async function PATCH(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const body = await request.json();

    const updateFields: Record<string, any> = {};
    if (body.isActive !== undefined) updateFields.isActive = !!body.isActive;
    if (body.earnRateAmount !== undefined) updateFields.earnRateAmount = Number(body.earnRateAmount) || 0;
    if (body.earnRatePoints !== undefined) updateFields.earnRatePoints = Number(body.earnRatePoints) || 0;
    if (body.redeemPointsAmount !== undefined) updateFields.redeemPointsAmount = Number(body.redeemPointsAmount) || 0;
    if (body.redeemValueAmount !== undefined) updateFields.redeemValueAmount = Number(body.redeemValueAmount) || 0;
    if (body.minRedeemPoints !== undefined) updateFields.minRedeemPoints = Number(body.minRedeemPoints) || 0;

    await db.collection("loyaltysettings").updateOne(
      {},
      { $set: { ...updateFields, updatedAt: new Date() } },
      { upsert: true }
    );

    const updated = await db.collection("loyaltysettings").findOne({});
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update loyalty settings" }, { status: 500 });
  }
}