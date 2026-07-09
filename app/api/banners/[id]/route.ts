import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

// PATCH: Update a banner — used for editing fields, toggling isActive,
// or swapping "order" when the admin moves a banner up/down in the list.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("onecarta");
    const body = await request.json();

    const updateFields: any = {};
    if (body.type !== undefined) updateFields.type = body.type;
    if (body.imageUrl !== undefined) updateFields.imageUrl = body.imageUrl;
    if (body.href !== undefined) updateFields.href = body.href;
    if (body.title !== undefined) updateFields.title = body.title;
    if (body.isActive !== undefined) updateFields.isActive = body.isActive;
    if (body.order !== undefined) updateFields.order = body.order;

    await db.collection("banners").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    const updated = await db.collection("banners").findOne({ _id: new ObjectId(id) });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
  }
}

// DELETE: Remove a banner permanently.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("onecarta");

    await db.collection("banners").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
}