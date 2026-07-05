import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

// GET: Fetch a single category by ID, along with its full breadcrumb chain
// (walking up via parentId) and its direct subcategories.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db("onecarta");

    const category = await db.collection("categories").findOne({ _id: new ObjectId(id) });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Walk up the parent chain to build the breadcrumb (root first)
    const breadcrumb: any[] = [category];
    let currentParentId = category.parentId;
    let safetyCounter = 0;
    while (currentParentId && safetyCounter < 20) {
      const parent = await db.collection("categories").findOne({ _id: currentParentId });
      if (!parent) break;
      breadcrumb.unshift(parent);
      currentParentId = parent.parentId;
      safetyCounter += 1;
    }

    const subCategories = await db
      .collection("categories")
      .find({ parentId: new ObjectId(id) })
      .sort({ order: 1, createdAt: 1 })
      .toArray();

    const subCategoriesWithCounts = await Promise.all(
      subCategories.map(async (sub) => {
        const subCount = await db.collection("categories").countDocuments({ parentId: sub._id });
        return { ...sub, subCategoryCount: subCount };
      })
    );

    return NextResponse.json({ category, breadcrumb, subCategories: subCategoriesWithCounts }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 });
  }
}

// PATCH: Update a category's name / description / images
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db("onecarta");
    const { name, shortDescription, bannerImage, image, icon } = await request.json();

    const updateFields: any = { updatedAt: new Date() };
    if (name !== undefined) {
      updateFields.name = name.trim();
      updateFields.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    }
    if (shortDescription !== undefined) updateFields.shortDescription = shortDescription;
    if (bannerImage !== undefined) updateFields.bannerImage = bannerImage;
    if (image !== undefined) updateFields.image = image;
    if (icon !== undefined) updateFields.icon = icon;

    await db.collection("categories").updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    const updated = await db.collection("categories").findOne({ _id: new ObjectId(id) });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

// DELETE: Remove a category. Also recursively deletes all of its descendants
// so we never leave orphaned subcategories behind.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db("onecarta");

    async function deleteWithDescendants(categoryId: string) {
      const children = await db.collection("categories").find({ parentId: new ObjectId(categoryId) }).toArray();
      for (const child of children) {
        await deleteWithDescendants(child._id.toString());
      }
      await db.collection("categories").deleteOne({ _id: new ObjectId(categoryId) });
    }

    await deleteWithDescendants(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}