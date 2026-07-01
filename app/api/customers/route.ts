import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  district: string;
  address: string;
  joinedDate: string;
  isRegistered: boolean;
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const [orders, users] = await Promise.all([
      db.collection("orders").find({}).sort({ createdAt: 1 }).toArray(),
      db.collection("users").find({ role: { $ne: "admin" } }).toArray(),
    ]);

    // Step 1: aggregate order stats per phone number (first order date preserved)
    type OrderStats = {
      ordersCount: number;
      district: string;
      address: string;
      latestName: string;
      latestEmail: string;
      firstOrderDate: string;
    };

    const orderStatsByPhone = new Map<string, OrderStats>();

    orders.forEach((order) => {
      const phone = order.customerPhone;
      if (!phone) return;

      const existing = orderStatsByPhone.get(phone);
      if (existing) {
        existing.ordersCount += 1;
        existing.latestName = order.customerName || existing.latestName;
        existing.latestEmail = order.customerEmail || existing.latestEmail;
        existing.district = order.district || existing.district;
        existing.address = order.customerAddress || existing.address;
      } else {
        orderStatsByPhone.set(phone, {
          ordersCount: 1,
          district: order.district || "",
          address: order.customerAddress || "",
          latestName: order.customerName || "",
          latestEmail: order.customerEmail || "",
          firstOrderDate: order.createdAt
            ? new Date(order.createdAt).toISOString()
            : new Date().toISOString(),
        });
      }
    });

    const customerMap = new Map<string, Customer>();

    // Step 2: registered users are the source of truth for identity
    users.forEach((user: any) => {
      const phone = user.phone || "";
      const stats = phone ? orderStatsByPhone.get(phone) : undefined;
      const defaultAddress =
        Array.isArray(user.addresses) && user.addresses.length > 0
          ? user.addresses.find((a: any) => a.isDefault) || user.addresses[0]
          : null;

      const key = phone || user.email || user._id.toString();

      customerMap.set(key, {
        id: user._id.toString(),
        name: user.name || stats?.latestName || "Unknown",
        email: user.email || "",
        phone,
        ordersCount: stats?.ordersCount || 0,
        district: stats?.district || defaultAddress?.district || "",
        address: stats?.address || defaultAddress?.homeAddress || "",
        joinedDate: user.createdAt
          ? new Date(user.createdAt).toISOString()
          : new Date().toISOString(),
        isRegistered: true,
      });

      if (phone) orderStatsByPhone.delete(phone);
    });

    // Step 3: remaining phones are guest (order-only) customers
    orderStatsByPhone.forEach((stats, phone) => {
      customerMap.set(phone, {
        id: phone,
        name: stats.latestName || "Unknown",
        email: stats.latestEmail || "",
        phone,
        ordersCount: stats.ordersCount,
        district: stats.district,
        address: stats.address,
        joinedDate: stats.firstOrderDate,
        isRegistered: false,
      });
    });

    const customers = Array.from(customerMap.values()).sort(
      (a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime()
    );

    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}