import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

// GET: Search analytics for the admin dashboard — reads directly from the
// shared `searchlogs` collection (written to by the storefront's Mongoose
// SearchLog model) using the native MongoDB driver, same pattern as the
// rest of this admin project's API routes.
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const topSearches = await db
      .collection("searchlogs")
      .find({})
      .sort({ count: -1 })
      .limit(20)
      .project({ term: 1, count: 1, resultsFoundCount: 1, lastSearchedAt: 1 })
      .toArray();

    const zeroResultSearches = await db
      .collection("searchlogs")
      .find({ resultsFoundCount: 0 })
      .sort({ count: -1 })
      .limit(20)
      .project({ term: 1, count: 1, lastSearchedAt: 1 })
      .toArray();

    return NextResponse.json({ topSearches, zeroResultSearches });
  } catch (error) {
    console.error("Search analytics error:", error);
    return NextResponse.json({ topSearches: [], zeroResultSearches: [] }, { status: 500 });
  }
}