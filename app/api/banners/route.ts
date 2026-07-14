import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

// GET: Fetch banners.
// - ?type=hero       -> only main slider banners
// - ?type=side       -> only right-side banners
// - omit type        -> all banners (admin management page uses this)
// - ?activeOnly=true -> only banners where isActive is true AND currently
//   within their scheduled window (if scheduling is enabled)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const activeOnly = searchParams.get("activeOnly");

    const client = await clientPromise;
    const db = client.db("onecarta");

    const filter: any = {};
    if (type === "hero" || type === "side") {
      filter.type = type;
    }
    if (activeOnly === "true") {
      const now = new Date();
      filter.isActive = true;
      filter.$or = [
        { scheduleEnabled: { $ne: true } },
        {
          scheduleEnabled: true,
          $and: [
            { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
          ],
        },
      ];
    }

    const banners = await db
      .collection("banners")
      .find(filter)
      .sort({ order: 1, createdAt: 1 })
      .toArray();

    return NextResponse.json(banners, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
  }
}

// POST: Create a new banner.
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const { type, imageUrl, href, title, isActive, scheduleEnabled, startDate, endDate } =
      await request.json();

    if (!type || (type !== "hero" && type !== "side")) {
      return NextResponse.json({ error: "Banner type must be 'hero' or 'side'" }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ error: "Banner image is required" }, { status: 400 });
    }

    const newBanner = {
      type,
      imageUrl,
      href: href || "/",
      title: title || "",
      isActive: isActive !== undefined ? isActive : true,
      order: Date.now(),
      scheduleEnabled: !!scheduleEnabled,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdAt: new Date(),
    };

    const result = await db.collection("banners").insertOne(newBanner);

    return NextResponse.json({ _id: result.insertedId, ...newBanner }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create banner" }, { status: 500 });
  }
}