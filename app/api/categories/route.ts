import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

// GET: Fetch categories.
// - Pass ?parentId=<id> to get the direct children of that category.
// - Omit it (or pass ?parentId=null) to get only top-level categories.
//   This is what the admin Categories management page uses to browse level by level.
// - Pass ?all=true to get EVERY category AND subcategory, at every depth,
//   as one flat list. This is what the Add Product page's Category dropdown
//   uses, since it needs to let admins pick any category or subcategory,
//   not just top-level ones.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentIdParam = searchParams.get("parentId");
    const allParam = searchParams.get("all");

    const client = await clientPromise;
    const db = client.db("onecarta");

    if (allParam === "true") {
      const allCategories = await db
        .collection("categories")
        .find({})
        .sort({ order: 1, createdAt: 1 })
        .toArray();

      const allWithCounts = await Promise.all(
        allCategories.map(async (cat) => {
          const subCount = await db.collection("categories").countDocuments({ parentId: cat._id });
          return { ...cat, subCategoryCount: subCount };
        })
      );

      return NextResponse.json(allWithCounts, { status: 200 });
    }

    let filter: any = { parentId: null };
    if (parentIdParam && parentIdParam !== "null") {
      filter = { parentId: new ObjectId(parentIdParam) };
    }

    const categories = await db.collection("categories").find(filter).sort({ order: 1, createdAt: 1 }).toArray();

    // Attach a live subcategory count to each category (for the "Total Subcategory" column)
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const subCount = await db.collection("categories").countDocuments({ parentId: cat._id });
        return { ...cat, subCategoryCount: subCount };
      })
    );

    return NextResponse.json(categoriesWithCounts, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST: Create a new category or sub-category. Pass parentId (string) to create
// a sub-category under that parent; omit/null it for a top-level category.
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const { name, shortDescription, bannerImage, image, parentId } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const newCategory = {
      name: name.trim(),
      slug,
      shortDescription: shortDescription || "",
      bannerImage: bannerImage || null,
      image: image || null,
      parentId: parentId ? new ObjectId(parentId) : null,
      order: Date.now(), // simple default ordering; drag-reorder can overwrite this later
      createdAt: new Date(),
    };

    const result = await db.collection("categories").insertOne(newCategory);

    return NextResponse.json({ _id: result.insertedId, ...newCategory, subCategoryCount: 0 }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}