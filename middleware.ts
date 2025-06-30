import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client";

// Extend the NextRequest type for NextAuth
declare module "next/server" {
  interface NextRequest {
    auth?: {
      user: {
        email?: string | null;
        name?: string | null;
        image?: string | null;
        role?: "CUSTOMER" | "PROVIDER" | "ADMIN";
        isFaceVerified?: boolean;
        isOtpVerified?: boolean;
      };
      token?: JWT;
    };
  }
}

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
      "/role",
      "/verify",
    ];
    const isPublicForUnauth = publicPathsForUnauth.some((path) =>
      pathname.startsWith(path)
    );

    // Provider-only protected routes
    const providerPaths = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ];
    const isProviderProtectedPath = providerPaths.some((path) =>
      pathname.startsWith(path)
    );

    // =======================
    // 🔐 Access Rules
    // =======================

    // 1. Unauthenticated user
    if (!token) {
      if (isPublicForUnauth) {
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

    // ✅ Block ALL logged-in users from /role or /verify (regardless of role or verification)
    if (pathname === "/role" || pathname === "/verify") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // PROVIDER must be face verified to access provider routes
    if (token.role === UserRole.PROVIDER && !token.isFaceVerified && isProviderProtectedPath) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // Non-provider accessing provider-only path → 403
    if (token.role !== UserRole.PROVIDER && isProviderProtectedPath) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // ✅ Default pass-through
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const publicPathsForAuthCheck = [
          "/",
          "/auth",
          "/auth/error",
          "/api/auth",
          "/_next",
          "/403",
          "/role",
          "/verify",
        ];
        const isPublic = publicPathsForAuthCheck.some((path) =>
          req.nextUrl.pathname.startsWith(path)
        );

        if (isPublic) return true;
        return !!token;
      },
    },
  }
);

// === Paths this middleware applies to ===
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
    "/",
    "/403",
  ],
};
