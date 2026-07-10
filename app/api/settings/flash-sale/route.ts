import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

// GET: Fetch current flash sale settings (singleton document, key: "flashSale")
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const doc = await db.collection("settings").findOne({ key: "flashSale" });

    return NextResponse.json(
      { isActive: doc?.isActive ?? true, endsAt: doc?.endsAt ?? null },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch flash sale settings" }, { status: 500 });
  }
}

// PUT: Update flash sale settings. Upserts the singleton "flashSale" settings document
// so there's always exactly one, regardless of whether this is the first save or the 50th.
export async function PUT(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const { isActive, endsAt } = await request.json();

    await db.collection("settings").updateOne(
      { key: "flashSale" },
      {
        $set: {
          key: "flashSale",
          isActive: !!isActive,
          endsAt: endsAt || null,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    const updated = await db.collection("settings").findOne({ key: "flashSale" });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save flash sale settings" }, { status: 500 });
  }
}