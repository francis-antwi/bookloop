import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client";

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

    const isPublicForUnauth = publicPathsForUnauth.some((path) => pathname.startsWith(path));

    const providerPaths = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ];
    const isProviderProtectedPath = providerPaths.some((path) => pathname.startsWith(path));

    // 1. Not logged in
    if (!token) {
      if (isPublicForUnauth) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. Logged in

    // Prevent logged-in users from accessing /auth (except error page)
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Admins can go anywhere except /role and /verify
    if (token.role === UserRole.ADMIN) {
      if (pathname === "/role" || pathname === "/verify") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // ✅ Updated: Allow /role only if user has no role yet
    if (pathname === "/role") {
      const hasRole =
        token.role === UserRole.CUSTOMER ||
        token.role === UserRole.PROVIDER ||
        token.role === UserRole.ADMIN;

      if (hasRole) {
        return NextResponse.redirect(new URL("/", req.url));
      }

      return NextResponse.next(); // allow new users without role
    }

    // /verify logic
    if (pathname === "/verify") {
      if (token.role === UserRole.PROVIDER && token.isFaceVerified) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (token.role === UserRole.CUSTOMER && token.isOtpVerified) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Provider-specific route protection
    if (token.role === UserRole.PROVIDER && !token.isFaceVerified && isProviderProtectedPath) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    if (token.role !== UserRole.PROVIDER && isProviderProtectedPath) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // Catch-all: redirect to home if not on a public route or protected route
    if (token && pathname !== "/" && !publicPathsForUnauth.includes(pathname) && !isProviderProtectedPath) {
      return NextResponse.redirect(new URL("/", req.url));
    }

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
        return isPublic || !!token;
      },
    },
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
