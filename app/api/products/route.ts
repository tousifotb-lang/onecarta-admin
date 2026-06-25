import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

// GET: Fetch all products from MongoDB, with category populated
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    // Use aggregation to join each product with its category document
    // so the frontend receives `category: { _id, name, slug }` instead of a raw ObjectId.
    const products = await db
      .collection("products")
      .aggregate([
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        {
          $addFields: {
            category: { $arrayElemAt: ["$categoryInfo", 0] },
          },
        },
        {
          $project: {
            categoryInfo: 0, // drop the temporary array, keep "category" object
          },
        },
      ])
      .toArray();

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST: Add a new real product to MongoDB
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const data = await request.json();

    const { title, price, discountPrice, description, images, categoryId, stock, sizes, colors } = data;

    // Strict Validation
    if (!title || !price || !images || images.length === 0) {
      return NextResponse.json({ error: "Missing required fields (Title, Price, or Images)" }, { status: 400 });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const newProduct = {
      title: title.trim(),
      slug: slug,
      price: parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : null,
      description: description || "",
      images: images, // Array of URLs
      categoryId: categoryId ? new ObjectId(categoryId) : null,
      stock: parseInt(stock) || 0,
      sizes: sizes || [],
      colors: colors || [],
      createdAt: new Date(),
    };

    const result = await db.collection("products").insertOne(newProduct);

    return NextResponse.json({ id: result.insertedId, ...newProduct }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Product slug already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

// DELETE: Remove a single product (?id=xxx) OR multiple products at once
// Bulk delete is sent as a JSON body: { ids: ["id1", "id2", ...] }
export async function DELETE(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get("id");

    // Try to read a JSON body for bulk delete. Single-delete calls from the
    // existing frontend don't send a body, so this is allowed to fail silently.
    let bulkIds: string[] = [];
    try {
      const body = await request.json();
      if (Array.isArray(body?.ids)) {
        bulkIds = body.ids;
      }
    } catch {
      // no body sent — fine for the single ?id= case
    }

    // --- Single delete ---
    if (singleId) {
      if (!ObjectId.isValid(singleId)) {
        return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
      }

      const result = await db.collection("products").deleteOne({ _id: new ObjectId(singleId) });

      if (result.deletedCount === 0) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, deletedCount: 1 }, { status: 200 });
    }

    // --- Bulk delete ---
    if (bulkIds.length > 0) {
      const validIds = bulkIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

      if (validIds.length === 0) {
        return NextResponse.json({ error: "No valid product IDs provided" }, { status: 400 });
      }

      const result = await db.collection("products").deleteMany({ _id: { $in: validIds } });

      return NextResponse.json({ success: true, deletedCount: result.deletedCount }, { status: 200 });
    }

    return NextResponse.json({ error: "No product ID(s) provided" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product(s)" }, { status: 500 });
  }
}

// PATCH: Update a single product (?id=xxx, body = fields to set)
// OR bulk-update many products at once (body = { ids: [...], updates: {...} })
export async function PATCH(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get("id");
    const body = await request.json();

    // --- Single update ---
    if (singleId) {
      if (!ObjectId.isValid(singleId)) {
        return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
      }

      const { _id, ...updateFields } = body;

      const result = await db.collection("products").findOneAndUpdate(
        { _id: new ObjectId(singleId) },
        { $set: { ...updateFields, updatedAt: new Date() } },
        { returnDocument: "after" }
      );

      if (!result) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      return NextResponse.json(result, { status: 200 });
    }

    // --- Bulk update (e.g. bulk status change, bulk category change) ---
    const { ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0 || !updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "ids[] and updates{} are required for bulk update" },
        { status: 400 }
      );
    }

    const validIds = ids.filter((id: string) => ObjectId.isValid(id)).map((id: string) => new ObjectId(id));

    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid product IDs provided" }, { status: 400 });
    }

    const result = await db.collection("products").updateMany(
      { _id: { $in: validIds } },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update product(s)" }, { status: 500 });
  }
}