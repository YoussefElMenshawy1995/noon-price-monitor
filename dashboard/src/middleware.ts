import { NextRequest, NextResponse } from "next/server";

/**
 * Edge-compatible middleware — uses Web Crypto API (not Node.js crypto)
 * to verify the session cookie on every protected request.
 */

async function getExpectedToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET || "noon-price-monitor-default-secret";
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 32);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through without auth
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get("pm_session")?.value;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify session token matches expected hash
  const expected = await getExpectedToken();
  if (session !== expected) {
    // Invalid token — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("pm_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
