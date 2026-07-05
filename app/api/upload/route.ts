import { NextResponse } from "next/server";
import crypto from "crypto";

// POST: Accepts a base64 file (data URL) and uploads it to Cloudinary using a
// server-side SIGNED upload (API secret never reaches the client).
// Body: { image: "data:image/png;base64,....", folder?: "onecarta/products", resourceType?: "image" | "video" }
export async function POST(request: Request) {
  try {
    const { image, folder, resourceType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          error:
            "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.local",
        },
        { status: 500 }
      );
    }

    const type = resourceType === "video" ? "video" : "image";
    const targetFolder = folder || "onecarta/general";
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign = `folder=${targetFolder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    const formData = new FormData();
    formData.append("file", image);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", targetFolder);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`, {
      method: "POST",
      body: formData,
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      return NextResponse.json({ error: uploadData.error?.message || "Cloudinary upload failed" }, { status: 500 });
    }

    return NextResponse.json({ url: uploadData.secure_url }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}