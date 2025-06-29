import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req) {
    if (!req.nextUrl) {
      console.error("req.nextUrl is undefined in middleware for path:", req.url);
      return NextResponse.next();
    }

    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    const publicPaths = [
      // Removed "/" from here as it's now excluded from the matcher
      "/auth",
      "/auth/error",
    ];

    const isPublicPath = publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    const providerRestrictedPaths = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ];
    const isProviderRestrictedPath = providerRestrictedPaths.some(
      (path) => pathname.startsWith(path)
    );

    if (!token) {
      if (isPublicPath || pathname === "/role" || pathname.startsWith("/auth")) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    if (!token.role && pathname !== "/role") {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    if (
      token.role === "PROVIDER" &&
      !token.isFaceVerified &&
      isProviderRestrictedPath &&
      pathname !== "/verify"
    ) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }
    if (token.role === "PROVIDER" && token.isFaceVerified && pathname === "/verify") {
      return NextResponse.redirect(new URL("/my-listings", req.url));
    }
    
    if (token.role !== "PROVIDER" && isProviderRestrictedPath) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    // Removed "/" from here to exclude it from middleware protection
    "/bookings/:path*",
    "/favourites/:path*",
    "/approvals/:path*",
    "/my-listings/:path*",
    "/notifications/:path*",
    "/admin/:path*",
    "/role",
    "/auth/:path*",
  ],
};