import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getSessionToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET || "noon-price-monitor-default-secret";
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 32);
}

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const validEmail = process.env.AUTH_EMAIL;
  const validPassword = process.env.AUTH_PASSWORD;

  if (!validEmail || !validPassword) {
    return NextResponse.json(
      { error: "Authentication not configured" },
      { status: 500 },
    );
  }

  if (email === validEmail && password === validPassword) {
    const token = await getSessionToken();

    const cookieStore = await cookies();
    cookieStore.set("pm_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
}
