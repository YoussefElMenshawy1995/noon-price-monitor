import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function getSessionToken(): string {
  const secret = process.env.AUTH_SECRET || "noon-price-monitor-default-secret";
  return crypto.createHash("sha256").update(secret).digest("hex").slice(0, 32);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API routes through
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check for valid session cookie
  const session = request.cookies.get("pm_session")?.value;
  const expectedToken = getSessionToken();

  if (!session || session !== expectedToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
