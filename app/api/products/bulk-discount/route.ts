import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

// Walks the category tree downward from `rootId` and returns the root's own
// id plus every descendant category id (children, grandchildren, etc., up to
// 15 levels deep as a safety cap) — raw-driver equivalent of the storefront's
// getDescendantCategoryIds() helper, since this admin app uses the native
// MongoDB driver instead of Mongoose.
async function getDescendantCategoryIds(db: any, rootId: ObjectId): Promise<ObjectId[]> {
  const allIds: ObjectId[] = [rootId];
  let frontier: ObjectId[] = [rootId];
  let depth = 0;

  while (frontier.length > 0 && depth < 15) {
    const children = await db
      .collection("categories")
      .find({ parentId: { $in: frontier } })
      .project({ _id: 1 })
      .toArray();

    const childIds = children.map((c: any) => c._id as ObjectId);
    if (childIds.length === 0) break;

    allIds.push(...childIds);
    frontier = childIds;
    depth += 1;
  }

  return allIds;
}

// GET: List currently active category-wide discounts
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const discounts = await db
      .collection("categoryDiscounts")
      .find({})
      .sort({ appliedAt: -1 })
      .toArray();
    return NextResponse.json(discounts, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch category discounts" }, { status: 500 });
  }
}

// POST: action = "preview" | "apply" | "remove"
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("onecarta");
    const body = await request.json();
    const { action, categoryId, includeSubcategories, discountType, discountValue } = body;

    if (!categoryId || !ObjectId.isValid(categoryId)) {
      return NextResponse.json({ error: "A valid categoryId is required" }, { status: 400 });
    }
    const categoryObjectId = new ObjectId(categoryId);

    const category = await db.collection("categories").findOne({ _id: categoryObjectId });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const targetCategoryIds = includeSubcategories
      ? await getDescendantCategoryIds(db, categoryObjectId)
      : [categoryObjectId];

    const matchFilter = { categoryId: { $in: targetCategoryIds } };

    // ---- PREVIEW: just count matching products, no writes ----
    if (action === "preview") {
      const productCount = await db.collection("products").countDocuments(matchFilter);
      return NextResponse.json({ productCount }, { status: 200 });
    }

    // ---- REMOVE: reset price back to originalPrice for the whole category ----
    if (action === "remove") {
      const result = await db.collection("products").updateMany(matchFilter, [
        { $set: { price: "$originalPrice", discount: 0, updatedAt: new Date() } },
      ]);
      await db.collection("categoryDiscounts").deleteOne({ categoryId: categoryObjectId });
      return NextResponse.json({ success: true, modifiedCount: result.modifiedCount }, { status: 200 });
    }

    // ---- APPLY (default) ----
    if (discountType !== "percentage" && discountType !== "flat") {
      return NextResponse.json({ error: "discountType must be 'percentage' or 'flat'" }, { status: 400 });
    }
    const value = Number(discountValue);
    if (!value || value <= 0) {
      return NextResponse.json({ error: "discountValue must be a positive number" }, { status: 400 });
    }
    if (discountType === "percentage" && value >= 100) {
      return NextResponse.json({ error: "Percentage discount must be less than 100%" }, { status: 400 });
    }

    // Aggregation-pipeline update — price/discount are always recalculated
    // from `originalPrice` (never from the current, possibly-already-discounted
    // `price`), so re-applying a new value here always cleanly replaces any
    // previous category discount instead of stacking on top of it.
    const updatePipeline =
      discountType === "percentage"
        ? [
            {
              $set: {
                price: { $round: [{ $multiply: ["$originalPrice", (100 - value) / 100] }, 0] },
                discount: Math.round(value),
                updatedAt: new Date(),
              },
            },
          ]
        : [
            {
              $set: {
                price: { $max: [0, { $round: [{ $subtract: ["$originalPrice", value] }, 0] }] },
                discount: {
                  $round: [
                    {
                      $cond: [
                        { $gt: ["$originalPrice", 0] },
                        { $multiply: [{ $divide: [value, "$originalPrice"] }, 100] },
                        0,
                      ],
                    },
                    0,
                  ],
                },
                updatedAt: new Date(),
              },
            },
          ];

    const result = await db.collection("products").updateMany(matchFilter, updatePipeline);

    await db.collection("categoryDiscounts").updateOne(
      { categoryId: categoryObjectId },
      {
        $set: {
          categoryId: categoryObjectId,
          categoryName: category.name,
          includeSubcategories: !!includeSubcategories,
          discountType,
          discountValue: value,
          productCount: result.modifiedCount,
          appliedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount }, { status: 200 });
  } catch (error: any) {
    console.error("Bulk category discount error:", error);
    return NextResponse.json({ error: "Failed to process category discount" }, { status: 500 });
  }
}