import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const client = await clientPromise;
    const db = client.db("onecarta");

    const [products, categories, orders] = await Promise.all([
      db.collection("products").find({}).toArray(),
      db.collection("categories").find({}).toArray(),
      db.collection("orders").find({}).sort({ createdAt: -1 }).toArray(),
    ]);

    const totalProducts = products.length;
    const totalCategories = categories.length;

    // Total Customers = unique customer phone numbers across all orders (real data,
    // no separate "users"/accounts system exists yet).
    const customerMap = new Map<string, { name: string; phone: string; orderCount: number; totalSpent: number }>();
    orders.forEach((o) => {
      if (!o.customerPhone) return;
      const existing = customerMap.get(o.customerPhone);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += Number(o.totalAmount) || 0;
      } else {
        customerMap.set(o.customerPhone, {
          name: o.customerName || "Anonymous",
          phone: o.customerPhone,
          orderCount: 1,
          totalSpent: Number(o.totalAmount) || 0,
        });
      }
    });
    const customerList = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
    const totalCustomers = customerList.length;

    let totalStockValue = 0;
    let outOfStockCount = 0;

    // Low Stock: stock is below 10 but NOT zero (zero-stock items belong in Out of Stock instead)
    const lowStockItems = products
      .map((p) => ({
        title: p.title || "Unknown Product",
        stock: Number(p.stock) || 0,
      }))
      .filter((p) => p.stock > 0 && p.stock < 10)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    // Out of Stock: stock is exactly zero
    const outOfStockItems = products
      .map((p) => ({
        title: p.title || "Unknown Product",
        stock: 0,
      }))
      .filter((p) => (Number(p.stock) || 0) === 0)
      .slice(0, 5);

    products.forEach((prod) => {
      const stock = Number(prod.stock) || 0;
      const price = Number(prod.price) || 0;
      totalStockValue += stock * price;
      if (stock === 0) outOfStockCount += 1;
    });

    // ---- Lifetime totals (all-time, not "today only") ----
    let totalRevenue = 0;
    orders.forEach((order) => {
      const amount = Number(order.totalAmount) || 0;
      totalRevenue += amount;
    });
    const totalOrdersCount = orders.length;

    // ---- Top Selling: real calculation from order line items ----
    const soldQtyByProductName: Record<string, number> = {};
    orders.forEach((order) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const name = item.name || "Unknown Product";
          soldQtyByProductName[name] = (soldQtyByProductName[name] || 0) + (Number(item.qty) || 0);
        });
      }
    });
    const topSellingItems = Object.entries(soldQtyByProductName)
      .map(([title, sold]) => ({ title, sold }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    // ---- Recent Orders (real field names: deliveryStatus, paymentStatus) ----
    const recentOrdersMapped = orders.slice(0, 5).map((o) => ({
      _id: o._id,
      orderId: o.orderId || "------",
      customerName: o.customerName || "Anonymous",
      paymentMethod: o.paymentStatus || "PENDING",
      totalAmount: o.totalAmount || 0,
      status: o.deliveryStatus || "Placed",
      createdAt: o.createdAt || new Date(),
      itemsCount: Array.isArray(o.items) ? o.items.length : 0,
    }));

    // ---- Orders by Status (for donut chart) ----
    const statusCounts: Record<string, number> = {};
    orders.forEach((o) => {
      const status = o.deliveryStatus || "Placed";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // ---- Revenue Overview: daily revenue for the requested date range (defaults to last 30 days) ----
    let rangeStart: Date;
    let rangeEnd: Date;

    if (startDateParam && endDateParam) {
      rangeStart = new Date(startDateParam);
      rangeEnd = new Date(endDateParam);
    } else {
      rangeEnd = new Date();
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 29);
    }

    // Normalize to midnight so the day-count includes both endpoints correctly
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(0, 0, 0, 0);

    const dayCount = Math.max(0, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))) + 1;
    const cappedDayCount = Math.min(dayCount, 366); // sanity cap to avoid runaway ranges

    const revenueOverview: { date: string; label: string; revenue: number }[] = [];
    for (let i = 0; i < cappedDayCount; i++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      const dateKey = d.toDateString();
      const dayRevenue = orders
        .filter((o) => o.createdAt && new Date(o.createdAt).toDateString() === dateKey)
        .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      revenueOverview.push({
        date: dateKey,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: dayRevenue,
      });
    }

    return NextResponse.json(
      {
        totalRevenue,
        totalOrdersCount,
        totalProducts,
        totalCategories,
        totalCustomers,
        customerList,
        totalStockValue,
        outOfStockCount,
        outOfStockItems,
        lowStockItems,
        topSellingItems,
        recentOrders: recentOrdersMapped,
        ordersByStatus,
        revenueOverview,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to calculate live analytics matrix" }, { status: 500 });
  }
}