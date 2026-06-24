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