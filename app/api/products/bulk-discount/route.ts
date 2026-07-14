import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

// Walks the category tree downward from `rootId` and returns the root's own
// id plus every descendant category id (children, grandchildren, etc., up to
// 15 levels deep as a safety cap).
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

    // ---- REMOVE: restore each product's own pre-discount price (which may
    // already have had its own individual manual discount before the bulk
    // discount was ever applied) — NOT a blind reset to originalPrice, which
    // would permanently wipe out any discount the product already had. ----
    if (action === "remove") {
      const result = await db.collection("products").updateMany(matchFilter, [
        {
          // Fall back to originalPrice only for products that somehow never
          // got a backup saved (e.g. legacy data) — otherwise use the saved backup.
          $set: {
            price: { $ifNull: ["$bulkDiscountBackupPrice", "$originalPrice"] },
          },
        },
        {
          $set: {
            discount: {
              $cond: [
                { $and: [{ $gt: ["$originalPrice", 0] }, { $gt: ["$originalPrice", "$price"] }] },
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: [{ $subtract: ["$originalPrice", "$price"] }, "$originalPrice"] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
                0,
              ],
            },
            updatedAt: new Date(),
          },
        },
        { $unset: "bulkDiscountBackupPrice" },
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

    const newPriceExpr =
      discountType === "percentage"
        ? { $round: [{ $multiply: ["$originalPrice", (100 - value) / 100] }, 0] }
        : { $max: [0, { $round: [{ $subtract: ["$originalPrice", value] }, 0] }] };

    const newDiscountExpr =
      discountType === "percentage"
        ? Math.round(value)
        : {
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
          };

    // Two-stage pipeline:
    // 1) Back up each product's CURRENT price (before this discount touches
    //    it) into `bulkDiscountBackupPrice` — but only if a backup doesn't
    //    already exist. This means re-applying a different value later (or
    //    stacking a second category discount edit) never overwrites the
    //    true original price with an already-discounted one.
    // 2) Then compute the new discounted price from originalPrice.
    const updatePipeline = [
      {
        $set: {
          bulkDiscountBackupPrice: { $ifNull: ["$bulkDiscountBackupPrice", "$price"] },
        },
      },
      {
        $set: {
          price: newPriceExpr,
          discount: newDiscountExpr,
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