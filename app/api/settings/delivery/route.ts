import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

const DEFAULT_RATES = { insideDhaka: 80, specialZone: 100, outsideDhaka: 120 };

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const doc = await db.collection("settings").findOne({ key: "delivery" });
    return NextResponse.json({ rates: doc?.rates || DEFAULT_RATES }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch delivery settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const { insideDhaka, specialZone, outsideDhaka } = await request.json();

    const insideDhakaNum = Number(insideDhaka);
    const specialZoneNum = Number(specialZone);
    const outsideDhakaNum = Number(outsideDhaka);

    if (
      !Number.isFinite(insideDhakaNum) || insideDhakaNum < 0 ||
      !Number.isFinite(specialZoneNum) || specialZoneNum < 0 ||
      !Number.isFinite(outsideDhakaNum) || outsideDhakaNum < 0
    ) {
      return NextResponse.json({ error: "All delivery rates must be valid non-negative numbers" }, { status: 400 });
    }

    await db.collection("settings").updateOne(
      { key: "delivery" },
      {
        $set: {
          key: "delivery",
          rates: { insideDhaka: insideDhakaNum, specialZone: specialZoneNum, outsideDhaka: outsideDhakaNum },
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    const updated = await db.collection("settings").findOne({ key: "delivery" });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save delivery settings" }, { status: 500 });
  }
}