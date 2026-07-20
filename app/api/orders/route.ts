import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

interface OrderDoc {
  statusHistory?: { status: string; changedAt: Date }[];
  deliveryStatus: string;
  updatedAt: Date;
}

// GET: Fetch all orders from MongoDB, most recent first
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const orders = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST: Create a new order (used by the manual "Create Order" admin form,
// AND by the storefront checkout page). Both flows hit this same endpoint.
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const data = await request.json();

    const {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      items,
      orderType,
      deliveryZone,
      deliveryCharge,
      discountPercent,
      discountAmount,
      vatPercent,
      vatAmount,
      paymentStatus,
      partialPaidAmount,
      deliveryStatus,
      isFraud,
      note,
      couponCode,
    } = data;

    if (!customerName || !customerPhone || !customerAddress) {
      return NextResponse.json(
        { error: "Missing required customer fields (Name, Phone, Address)" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one product" },
        { status: 400 }
      );
    }

    const normalizedCouponCode = couponCode ? String(couponCode).trim().toUpperCase() : "";
    const normalizedPhone = String(customerPhone).replace(/\D/g, "");

    if (normalizedCouponCode) {
      const promo = await db.collection("promocodes").findOne({ codeName: normalizedCouponCode });
      if (promo?.hasUsageLimit) {
        const limit = Number(promo.usageLimitPerUser) || 0;
        if (limit > 0 && normalizedPhone) {
          const usedCount = await db.collection("orders").countDocuments({
            couponCode: normalizedCouponCode,
            customerPhone: normalizedPhone,
          });
          if (usedCount >= limit) {
            return NextResponse.json(
              { error: `This coupon can only be used ${limit} time(s) per customer.` },
              { status: 400 }
            );
          }
        }
      }
    }

    const itemsSubtotal = items.reduce(
      (sum: number, item: any) => sum + Number(item.unitPrice) * Number(item.qty),
      0
    );

    const totalAmount = Math.max(
      0,
      itemsSubtotal - (Number(discountAmount) || 0) + (Number(vatAmount) || 0) + (Number(deliveryCharge) || 0)
    );

    const orderId = String(Math.floor(1000000 + Math.random() * 9000000));

    const createdAt = new Date();
    const initialStatus = deliveryStatus || "Placed";

    const newOrder = {
      orderId,
      customerName: String(customerName).trim(),
      customerEmail: customerEmail ? String(customerEmail).trim() : "",
      customerPhone: normalizedPhone || String(customerPhone).trim(),
      customerAddress: String(customerAddress).trim(),
      items: items.map((item: any) => ({
        productId: item.productId ? new ObjectId(item.productId) : null,
        name: item.name,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
      })),
      orderType: orderType || "In shop",
      deliveryZone: deliveryZone || "Inside Dhaka",
      deliveryCharge: Number(deliveryCharge) || 0,
      discountPercent: Number(discountPercent) || 0,
      discountAmount: Number(discountAmount) || 0,
      couponCode: normalizedCouponCode || null,
      vatPercent: Number(vatPercent) || 0,
      vatAmount: Number(vatAmount) || 0,
      itemsSubtotal,
      totalAmount,
      paymentStatus: paymentStatus === "Fully Paid" ? "PAID" : "PENDING",
      partialPaidAmount: paymentStatus === "Partial" ? Number(partialPaidAmount) || 0 : totalAmount,
      deliveryStatus: initialStatus,
      statusHistory: [
        { status: initialStatus, changedAt: createdAt },
      ],
      isFraud: !!isFraud,
      note: note || "",
      pointsEarned: 0,
      pointsEarnedCredited: false,
      pointsRedeemed: 0,
      pointsDiscountAmount: 0,
      pointsRedeemedRefunded: false,
      createdAt,
      updatedAt: createdAt,
    };

    const result = await db.collection("orders").insertOne(newOrder);

    return NextResponse.json({ _id: result.insertedId, ...newOrder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

// Credits loyalty points for every order in `orderIds` that (a) belongs to a
// registered customer (userId set — guest orders can't earn points), and
// (b) hasn't already had points credited.
//
// If the order already has a numeric `pointsEarned` (locked in at checkout —
// every order placed after this feature shipped), that exact value is used.
// If `pointsEarned` is missing entirely (a legacy order from before this
// feature existed on checkout), it's computed now from the CURRENT rate as
// a one-time fallback, so old orders aren't permanently stuck at zero.
async function creditLoyaltyPointsForDeliveredOrders(db: any, orderIds: ObjectId[]) {
  const settingsDoc = await db.collection("loyaltysettings").findOne({});
  const isActive = settingsDoc?.isActive ?? true;
  const earnRateAmount = Number(settingsDoc?.earnRateAmount ?? 100) || 0;
  const earnRatePoints = Number(settingsDoc?.earnRatePoints ?? 1) || 0;

  const orders = await db.collection("orders").find({
    _id: { $in: orderIds },
    userId: { $ne: null },
    pointsEarnedCredited: { $ne: true },
  }).toArray();

  for (const order of orders) {
    let pointsEarned: number;

    if (typeof order.pointsEarned === "number") {
      pointsEarned = order.pointsEarned;
    } else {
      if (!isActive || earnRateAmount <= 0 || earnRatePoints <= 0) {
        pointsEarned = 0;
      } else {
        const basis = Math.max(
          0,
          (order.itemsSubtotal || 0) - (order.discountAmount || 0) - (order.pointsDiscountAmount || 0)
        );
        pointsEarned = Math.floor(basis / earnRateAmount) * earnRatePoints;
      }
    }

    await db.collection("orders").updateOne(
      { _id: order._id },
      { $set: { pointsEarnedCredited: true, pointsEarned } }
    );

    if (pointsEarned <= 0) continue;

    await db.collection("users").updateOne(
      { _id: order.userId },
      { $inc: { loyaltyPoints: pointsEarned } }
    );

    // Convert the pending "earned" transaction (logged at checkout) into a
    // completed one, or create it now for legacy orders that never got one.
    const existingPending = await db.collection("loyaltytransactions").findOne({
      orderId: order._id,
      type: "earned",
      status: "pending",
    });

    if (existingPending) {
      await db.collection("loyaltytransactions").updateOne(
        { _id: existingPending._id },
        {
          $set: {
            status: "completed",
            description: `Earned from order #${order.orderId}`,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await db.collection("loyaltytransactions").insertOne({
        userId: order.userId,
        type: "earned",
        status: "completed",
        points: pointsEarned,
        orderId: order._id,
        description: `Earned from order #${order.orderId}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

// Handles BOTH sides of a Cancelled/Returned order:
// 1. Refunds any REDEEMED points (already deducted from the balance at
//    checkout) back to the customer.
// 2. VOIDS any still-PENDING earned points — these were never actually in
//    the balance, so there's nothing to subtract; this just stops them from
//    being credited later and records why in the history.
async function refundAndVoidLoyaltyPointsForCancelledOrders(db: any, orderIds: ObjectId[]) {
  const ordersWithRedemption = await db.collection("orders").find({
    _id: { $in: orderIds },
    userId: { $ne: null },
    pointsRedeemed: { $gt: 0 },
    pointsRedeemedRefunded: { $ne: true },
  }).toArray();

  for (const order of ordersWithRedemption) {
    await db.collection("users").updateOne(
      { _id: order.userId },
      { $inc: { loyaltyPoints: order.pointsRedeemed } }
    );
    await db.collection("orders").updateOne(
      { _id: order._id },
      { $set: { pointsRedeemedRefunded: true } }
    );
    await db.collection("loyaltytransactions").insertOne({
      userId: order.userId,
      type: "refunded",
      status: "completed",
      points: order.pointsRedeemed,
      orderId: order._id,
      description: `Refunded — order #${order.orderId} was ${order.deliveryStatus}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const ordersWithPendingEarn = await db.collection("orders").find({
    _id: { $in: orderIds },
    userId: { $ne: null },
    pointsEarnedCredited: { $ne: true },
  }).toArray();

  for (const order of ordersWithPendingEarn) {
    await db.collection("orders").updateOne(
      { _id: order._id },
      { $set: { pointsEarnedCredited: true } } // prevents any future crediting
    );
    await db.collection("loyaltytransactions").updateMany(
      { orderId: order._id, type: "earned", status: "pending" },
      {
        $set: {
          status: "voided",
          description: `Voided — order #${order.orderId} was ${order.deliveryStatus}`,
          updatedAt: new Date(),
        },
      }
    );
  }
}

// PATCH: Bulk-update deliveryStatus for one or more orders by _id.
// Body shape: { orderIds: string[], deliveryStatus: string }
export async function PATCH(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const { orderIds, deliveryStatus } = await request.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "orderIds array is required" }, { status: 400 });
    }
    if (!deliveryStatus) {
      return NextResponse.json({ error: "deliveryStatus is required" }, { status: 400 });
    }

    const objectIds = orderIds.map((id: string) => new ObjectId(id));
    const changedAt = new Date();

    const result = await db.collection<OrderDoc>("orders").updateMany(
      { _id: { $in: objectIds } },
      {
        $set: { deliveryStatus, updatedAt: changedAt },
        $push: { statusHistory: { status: deliveryStatus, changedAt } },
      }
    );

    if (deliveryStatus === "Delivered") {
      await creditLoyaltyPointsForDeliveredOrders(db, objectIds);
    } else if (deliveryStatus === "Cancelled" || deliveryStatus === "Returned") {
      await refundAndVoidLoyaltyPointsForCancelledOrders(db, objectIds);
    }

    return NextResponse.json(
      { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}