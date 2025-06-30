// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.nextauth?.token;

  const publicPaths = [
    "/auth",
    "/auth/error",
    "/api/auth",
    "/_next",
  ];
  const isPublic = publicPaths.some(path => pathname.startsWith(path));
  const providerPaths = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"];
  const isProviderPath = providerPaths.some(path => pathname.startsWith(path));

  // 1. Not logged in (no token)
  if (!token) {
    if (isPublic || pathname === "/role" || pathname === "/verify") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  // 2. Logged in, but role not yet selected
  if (!token.role && pathname !== "/role") {
    return NextResponse.redirect(new URL("/role", req.url));
  }

  // --- START MODIFIED/CLARIFIED LOGIC ---

  // 3. Prevent any user with an assigned role from re-accessing the /role selection page
  // This covers both verified providers and customers (and any other role).
  if (token.role && pathname === "/role") {
    // Verified providers will be redirected from /role
    // Customers will be redirected from /role
    // Any user who has a role assigned will be redirected
    return NextResponse.redirect(new URL("/", req.url)); // Redirect to homepage or appropriate dashboard
  }

  // 4. Provider verification guards
  if (token.role === "PROVIDER") {
    // If a PROVIDER is verified and tries to access /verify, redirect to their listings.
    // This also means verified providers cannot access /verify.
    if (token.isFaceVerified && pathname === "/verify") {
      return NextResponse.redirect(new URL("/my-listings", req.url));
    }
    // If a PROVIDER is NOT verified and tries to access provider-specific paths (excluding /verify), redirect to /verify.
    if (!token.isFaceVerified && isProviderPath && pathname !== "/verify") {
      return NextResponse.redirect(new URL("/verify", req.url));
    }
  }

  // 5. Prevent customers (and other non-providers) from accessing provider routes or /verify
  // This also means customers cannot access /verify.
  if (token.role !== "PROVIDER" && (isProviderPath || pathname === "/verify")) {
    return NextResponse.redirect(new URL("/403", req.url)); // Forbidden
  }

  // --- END MODIFIED/CLARIFIED LOGIC ---


  // 6. Admin protection
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  // If none of the above conditions trigger a redirect, allow the request to proceed.
  return NextResponse.next();
}, {
  callbacks: { authorized: () => true },
});

export const config = {
  matcher: [
    "/bookings/:path*",
    "/favourites/:path*",
    "/approvals/:path*",
    "/my-listings/:path*",
    "/notifications/:path*",
    "/admin/:path*",
    "/role",
    "/verify",
    "/auth/:path*",
    "/api/auth/:path*",
  ],
};