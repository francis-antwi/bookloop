import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    // Public routes (for unauthenticated access)
    const publicPathsForUnauth = [
      "/",
      "/auth",
      "/auth/error",
      "/api/auth",
      "/_next",
      "/403",
      "/role",  // Allow access initially
      "/verify",
    ];

    // Provider-only protected routes
    const providerPaths = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ];

    // =======================
    // 🔐 Access Rules
    // =======================

    // 1. Unauthenticated user
    if (!token) {
      if (publicPathsForUnauth.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. Authenticated user

    // Don't allow logged-in users on /auth pages (except error)
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Allow ADMIN full access (but block /role and /verify)
    if (token.role === UserRole.ADMIN) {
      if (pathname === "/role" || pathname === "/verify") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Block ALL logged-in users from /role if they already have a role
    if (pathname === "/role" && token.role) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Block ALL logged-in users from /verify unless they're unverified providers
    if (pathname === "/verify") {
      if (token.role !== UserRole.PROVIDER || token.isFaceVerified) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // PROVIDER must be face verified to access provider routes
    if (token.role === UserRole.PROVIDER && !token.isFaceVerified && providerPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // Non-provider accessing provider-only path → 403
    if (token.role !== UserRole.PROVIDER && providerPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // New users without roles should go to role selection
    if (!token.role && !["/role", "/auth", "/api/auth"].some(path => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

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