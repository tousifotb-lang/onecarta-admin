import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

// GET: Fetch all products from MongoDB
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const products = await db
      .collection("products")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// Helper: try to resolve a categoryId ObjectId from either a provided
// categoryId, or by looking up the categories collection using the
// human-readable category name/slug the admin form sends.
async function resolveCategoryId(
  db: any,
  category: string,
  providedCategoryId?: string
): Promise<ObjectId | null> {
  // 1) If the caller already sent a valid categoryId, just use it.
  if (providedCategoryId && ObjectId.isValid(providedCategoryId)) {
    return new ObjectId(providedCategoryId);
  }

  if (!category) return null;

  const trimmed = category.trim();
  const categoriesCol = db.collection("categories");

  // 2) Try matching by common field names, case-insensitive, against
  // both the raw category string and a slugified version of it.
  const slugified = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const match = await categoriesCol.findOne({
    $or: [
      { name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } },
      { title: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } },
      { slug: slugified },
    ],
  });

  return match ? match._id : null;
}

// POST: Add a new product — field names now match the storefront's Mongoose Product schema
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const data = await request.json();

    const {
      name,
      description,
      price,
      originalPrice,
      images,
      category,
      categoryId, // optional — admin form may or may not send this
      brand,
      stock,
      isActive,
      sku,
      tags,
      isFeatured,
      isFlashSale,
      isBestSelling,
    } = data;

    // Strict Validation (matches storefront schema's required fields)
    if (!name || !price || !images || images.length === 0 || !category) {
      return NextResponse.json(
        { error: "Missing required fields (Name, Price, Category, or Images)" },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const finalPrice = parseFloat(price);
    const finalOriginalPrice = originalPrice ? parseFloat(originalPrice) : finalPrice;
    const discount =
      finalOriginalPrice > finalPrice
        ? Math.round(((finalOriginalPrice - finalPrice) / finalOriginalPrice) * 100)
        : 0;

    const resolvedIsActive = isActive !== undefined ? isActive : true;

    // Resolve the categoryId reference so storefront queries that filter
    // by categoryId can actually find this product.
    const resolvedCategoryId = await resolveCategoryId(db, category, categoryId);

    const newProduct: Record<string, any> = {
      name: name.trim(),
      title: name.trim(), // storefront listing also reads `title` on some product docs
      slug,
      description: description || "",
      price: finalPrice,
      originalPrice: finalOriginalPrice,
      discount,
      images,
      category: category.trim(),
      brand: brand || "",
      stock: parseInt(stock) || 0,
      sold: 0,
      rating: 0,
      reviewCount: 0,
      tags: tags || [],
      isActive: resolvedIsActive,
      // storefront's product-listing filter relies on `status`, not just
      // `isActive` — this was missing before and silently hid new products.
      status: resolvedIsActive ? "ACTIVE" : "INACTIVE",
      isFeatured: isFeatured || false,
      isFlashSale: isFlashSale || false,
      isBestSelling: isBestSelling || false,
      sku: sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (resolvedCategoryId) {
      newProduct.categoryId = resolvedCategoryId;
    }

    const result = await db.collection("products").insertOne(newProduct);

    return NextResponse.json({ _id: result.insertedId, ...newProduct }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "A product with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

// DELETE: unchanged from before (single ?id=xxx or bulk { ids: [...] })
export async function DELETE(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get("id");

    let bulkIds: string[] = [];
    try {
      const body = await request.json();
      if (Array.isArray(body?.ids)) {
        bulkIds = body.ids;
      }
    } catch {
      // no body sent — fine for the single ?id= case
    }

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

// PATCH: Update a single product (?id=xxx) OR bulk-update (body = { ids, updates })
export async function PATCH(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");

    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get("id");
    const body = await request.json();

    if (singleId) {
      if (!ObjectId.isValid(singleId)) {
        return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
      }

      const { _id, ...updateFields } = body;

      // Detect a stock-out -> back-in-stock transition (0 or less -> >0) so
      // we can stamp restockedAt. This is what powers the storefront's
      // "Recently Restocked" section — only runs when this edit actually
      // touches the stock field.
      if (updateFields.stock !== undefined) {
        const existingProduct = await db.collection("products").findOne(
          { _id: new ObjectId(singleId) },
          { projection: { stock: 1 } }
        );
        const oldStock = existingProduct?.stock ?? 0;
        const newStock = parseInt(updateFields.stock) || 0;
        if (oldStock <= 0 && newStock > 0) {
          updateFields.restockedAt = new Date();
        }
      }

      // Recompute slug + discount if name/price fields changed, keeping data consistent
      if (updateFields.name) {
        updateFields.slug = updateFields.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
        updateFields.title = updateFields.name;
      }
      if (updateFields.price && updateFields.originalPrice) {
        const p = parseFloat(updateFields.price);
        const op = parseFloat(updateFields.originalPrice);
        updateFields.discount = op > p ? Math.round(((op - p) / op) * 100) : 0;
      }

      // Keep status and isActive in sync if either one is being updated,
      // so partial edits (e.g. toggling just isActive) don't desync them again.
      if (updateFields.isActive !== undefined && updateFields.status === undefined) {
        updateFields.status = updateFields.isActive ? "ACTIVE" : "INACTIVE";
      } else if (updateFields.status !== undefined && updateFields.isActive === undefined) {
        updateFields.isActive = updateFields.status === "ACTIVE";
      }

      // Allow resolving categoryId if a plain category name was passed in an edit
      if (updateFields.category && !updateFields.categoryId) {
        const resolved = await resolveCategoryId(db, updateFields.category);
        if (resolved) {
          updateFields.categoryId = resolved;
        }
      }

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

    const { ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0 || !updates || typeof updates !== "object") {
      return NextResponse.json({ error: "ids[] and updates{} are required for bulk update" }, { status: 400 });
    }

    const validIds = ids.filter((id: string) => ObjectId.isValid(id)).map((id: string) => new ObjectId(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid product IDs provided" }, { status: 400 });
    }

    const bulkUpdates: Record<string, any> = { ...updates };
    if (bulkUpdates.isActive !== undefined && bulkUpdates.status === undefined) {
      bulkUpdates.status = bulkUpdates.isActive ? "ACTIVE" : "INACTIVE";
    } else if (bulkUpdates.status !== undefined && bulkUpdates.isActive === undefined) {
      bulkUpdates.isActive = bulkUpdates.status === "ACTIVE";
    }

    const result = await db.collection("products").updateMany(
      { _id: { $in: validIds } },
      { $set: { ...bulkUpdates, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount }, { status: 200 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Another product already uses this name/slug" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update product(s)" }, { status: 500 });
  }
}