import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clearing an httpOnly cookie requires a server-side response —
  // client-side document.cookie cannot touch it.
  response.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // expires immediately
    path: "/",
  });

  return response;
}