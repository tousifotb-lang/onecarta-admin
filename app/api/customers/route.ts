import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

// GET: Build the customer list by aggregating unique customers (by phone number)
// out of the orders collection. There is no separate registered-customer merge
// yet — that will be added once the storefront's registration system is wired
// up to this admin panel's backend.
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const orders = await db.collection("orders").find({}).sort({ createdAt: 1 }).toArray();

    const customerMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        phone: string;
        ordersCount: number;
        district: string;
        address: string;
        joinedDate: string; // ISO string of the first order's createdAt
      }
    >();

    orders.forEach((order) => {
      const phone = order.customerPhone;
      if (!phone) return;

      const existing = customerMap.get(phone);
      if (existing) {
        existing.ordersCount += 1;
        // Keep the most recent name/address/email in case it was corrected on a later order
        existing.name = order.customerName || existing.name;
        existing.address = order.customerAddress || existing.address;
        existing.email = order.customerEmail || existing.email;
      } else {
        customerMap.set(phone, {
          id: phone, // phone number doubles as a stable unique id here
          name: order.customerName || "Unknown",
          email: order.customerEmail || "",
          phone,
          ordersCount: 1,
          district: order.district || "",
          address: order.customerAddress || "",
          joinedDate: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
        });
      }
    });

    const customers = Array.from(customerMap.values()).sort(
      (a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime()
    );

    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}