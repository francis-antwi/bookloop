import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client";

declare module "next-auth/jwt" {
  interface JWT {
    role?: "CUSTOMER" | "PROVIDER" | "ADMIN";
    isFaceVerified?: boolean;
    isOtpVerified?: boolean;
    userExists?: boolean;
  }
}

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const isPublicPath = [
      "/",
      "/auth",
      "/auth/error",
      "/api/auth",
      "/_next",
      "/403",
      "/role",
      "/verify",
    ].some((p) => pathname.startsWith(p));

    const isProviderRoute = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ].some((p) => pathname.startsWith(p));

    // === 1. Not Logged In
    if (!token) {
      if (isPublicPath) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // === 2. Logged In

    // Block all users from /auth pages except error
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // ADMIN: Full access except /role and /verify
    if (token.role === UserRole.ADMIN) {
      if (pathname === "/role" || pathname === "/verify") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // 🚫 Block EXISTING users from /role
    if (pathname === "/role" && token.userExists) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 🚫 Block EXISTING users from /verify unless PROVIDER and not verified
    if (pathname === "/verify") {
      if (
        token.role !== UserRole.PROVIDER ||
        token.isFaceVerified ||
        !token.userExists
      ) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next(); // ✅ Allow PROVIDERs who are unverified
    }

    // 🔐 PROVIDER must be verified to access protected provider routes
    if (
      token.role === UserRole.PROVIDER &&
      !token.isFaceVerified &&
      isProviderRoute
    ) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // 🚫 Non-provider trying to access provider-only routes
    if (
      token.role !== UserRole.PROVIDER &&
      isProviderRoute
    ) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 🚧 New users without role should be forced to /role
    if (
      !token.role &&
      !pathname.startsWith("/role") &&
      !pathname.startsWith("/auth")
    ) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    return NextResponse.next(); // ✅ Allow
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // basic token presence
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
