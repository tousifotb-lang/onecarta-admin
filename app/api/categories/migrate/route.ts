import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

// POST: One-time migration. Sets parentId: null on any existing category
// document that doesn't already have a parentId field (i.e. categories created
// before the recursive sub-category system existed). Safe to run multiple times —
// already-migrated categories are skipped automatically.
export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const result = await db.collection("categories").updateMany(
      { parentId: { $exists: false } },
      { $set: { parentId: null } }
    );

    return NextResponse.json(
      {
        message: "Migration complete",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}