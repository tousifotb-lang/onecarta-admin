import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

// GET: Fetch current announcement bar settings (singleton document, key: "announcement")
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const doc = await db.collection("settings").findOne({ key: "announcement" });

    return NextResponse.json(
      { isActive: doc?.isActive ?? false, text: doc?.text ?? "" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch announcement settings" }, { status: 500 });
  }
}

// PUT: Update announcement bar settings. Upserts the singleton "announcement" document.
export async function PUT(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const { isActive, text } = await request.json();

    await db.collection("settings").updateOne(
      { key: "announcement" },
      {
        $set: {
          key: "announcement",
          isActive: !!isActive,
          text: typeof text === "string" ? text.trim() : "",
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    const updated = await db.collection("settings").findOne({ key: "announcement" });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save announcement settings" }, { status: 500 });
  }
}