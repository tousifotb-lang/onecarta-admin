import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, apiKey, secretKey } = body;

    if (!endpoint || !apiKey || !secretKey) {
      return NextResponse.json(
        { error: "Missing API key, secret key, or endpoint URL." },
        { status: 400 }
      );
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "api-key": apiKey,
        "secret-key": secretKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      const rawText = await response.text();
      return NextResponse.json(
        {
          error: "Unauthorized: Invalid API Key. Please double check your Mohasagor key.",
          debug: rawText,
        },
        { status: 401 }
      );
    }

    if (!response.ok) {
      const rawText = await response.text();
      return NextResponse.json(
        { error: `Supplier server returned status code: ${response.status}`, debug: rawText },
        { status: response.status }
      );
    }

    const data = await response.json();

    const incomingProductsList = data.products || data.data || data.items || [];

    if (incomingProductsList.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No active products found in the feed.",
      });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db("onecarta");

    // Resolve the default fallback category ("Fashion") once per sync run.
    // All Mohashagor products land here since their numeric category_id
    // doesn't map to our real ObjectId-based categories yet.
    const fallbackCategory = await db.collection("categories").findOne({ name: "Fashion" });
    const fallbackCategoryId = fallbackCategory ? fallbackCategory._id : null;

    const collection = db.collection("products");

    const bulkOperations = incomingProductsList.map((product: any) => {
      const uniqueId = product.id || product._id;

      // Images: thumbnail first, then any product_image entries
      let parsedImages: string[] = [];
      if (product.thumbnail_img) {
        parsedImages.push(product.thumbnail_img);
      }
      if (product.product_image && Array.isArray(product.product_image)) {
        const galleryImages = product.product_image
          .map((imgObj: any) => imgObj.product_image)
          .filter(Boolean);
        parsedImages.push(...galleryImages);
      }

      // Price mapping (per explicit confirmation):
      // Mohashagor's "sale_price" (their cost-to-you) -> our Regular Price
      // Mohashagor's "reselling_price" (what we charge customers) -> our Selling Price (discountPrice)
      // Both values live inside product_variant[]; fall back to top-level price/discount if no variant exists.
      const firstVariant = Array.isArray(product.product_variant) ? product.product_variant[0] : null;

      const regularPrice = firstVariant?.sale_price !== undefined
        ? Number(firstVariant.sale_price)
        : Number(product.price || 0);

      const sellingPrice = firstVariant?.reselling_price !== undefined
        ? Number(firstVariant.reselling_price)
        : null;

      return {
        updateOne: {
          filter: { supplierProductId: String(uniqueId) },
          update: {
            $set: {
              title: product.name || "Unnamed Product",
              price: regularPrice,
              discountPrice: sellingPrice,
              description: product.details || "",
              images: parsedImages,
              categoryId: fallbackCategoryId,
              // Mohashagor's status code meaning isn't fully documented/confirmed yet,
              // so we assign a random in-stock quantity (50-100) per product.
              // Adjust this once exact stock quantities are confirmed from the supplier.
              stock: Math.floor(Math.random() * (100 - 50 + 1)) + 50,
              slug: product.slug || `product-${uniqueId}`,
              supplierProductId: String(uniqueId),
              sizes: [],
              colors: [],
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    const result = await collection.bulkWrite(bulkOperations);

    return NextResponse.json({
      success: true,
      count: incomingProductsList.length,
      insertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      defaultCategoryUsed: fallbackCategory ? fallbackCategory.name : "none found (categoryId set to null)",
    });

  } catch (error: any) {
    console.error("Sync Error: ", error);
    return NextResponse.json(
      { error: error?.message || "Internal database sync crash." },
      { status: 500 }
    );
  }
}