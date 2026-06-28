import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

// Minimal shape used only so the MongoDB driver knows statusHistory is an
// array field it can $push into (fixes "PushOperator<Document>" TS error).
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
// e.g. for orders taken over Messenger/inbox). Online/website checkout orders
// would call this same endpoint automatically from the storefront in the future.
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
      items, // [{ productId, name, qty, unitPrice }]
      orderType, // "In shop" | "Online"
      deliveryZone,
      deliveryCharge,
      discountPercent,
      discountAmount,
      vatPercent,
      vatAmount,
      paymentStatus, // "Fully Paid" | "Partial"
      partialPaidAmount,
      deliveryStatus,
      isFraud,
      note,
    } = data;

    // Validation
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

    const itemsSubtotal = items.reduce(
      (sum: number, item: any) => sum + Number(item.unitPrice) * Number(item.qty),
      0
    );

    const totalAmount = Math.max(
      0,
      itemsSubtotal - (Number(discountAmount) || 0) + (Number(vatAmount) || 0) + (Number(deliveryCharge) || 0)
    );

    // Generate a short numeric-style order ID (matches the existing "#2368431" style)
    const orderId = String(Math.floor(1000000 + Math.random() * 9000000));

    const createdAt = new Date();
    const initialStatus = deliveryStatus || "Placed";

    const newOrder = {
      orderId,
      customerName: String(customerName).trim(),
      customerEmail: customerEmail ? String(customerEmail).trim() : "",
      customerPhone: String(customerPhone).trim(),
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
      vatPercent: Number(vatPercent) || 0,
      vatAmount: Number(vatAmount) || 0,
      itemsSubtotal,
      totalAmount,
      paymentStatus: paymentStatus === "Fully Paid" ? "PAID" : "PENDING",
      partialPaidAmount: paymentStatus === "Partial" ? Number(partialPaidAmount) || 0 : totalAmount,
      deliveryStatus: initialStatus,
      // REAL-TIME STATUS TIMELINE: every status this order has ever had, with the
      // exact timestamp it was set. The "Placed" (or whatever the order starts as)
      // entry is recorded right away so the timeline has a starting point.
      statusHistory: [
        { status: initialStatus, changedAt: createdAt },
      ],
      isFraud: !!isFraud,
      note: note || "",
      createdAt,
      updatedAt: createdAt,
    };

    const result = await db.collection("orders").insertOne(newOrder);

    return NextResponse.json({ _id: result.insertedId, ...newOrder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
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

    // REAL-TIME STATUS TIMELINE: every time the status changes, push a new
    // { status, changedAt } entry onto statusHistory instead of overwriting it.
    // This is how the "View Order" timeline knows exactly when each stage happened.
    const result = await db.collection<OrderDoc>("orders").updateMany(
      { _id: { $in: objectIds } },
      {
        $set: { deliveryStatus, updatedAt: changedAt },
        $push: { statusHistory: { status: deliveryStatus, changedAt } },
      }
    );

    return NextResponse.json(
      { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}