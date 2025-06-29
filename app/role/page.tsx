import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    const publicPaths = [
      "/", // Home page
      "/auth", // Authentication routes (login, register)
      "/auth/error", // Auth error page
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
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    // 1. Handle unauthenticated users
    if (!token) {
      if (isPublicPath || pathname === "/role" || pathname === "/verify") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // From this point, user is authenticated

    // 2. Enforce role selection if role is missing
    if (!token.role && pathname !== "/role") {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 3. Handle role-specific restrictions
    if (token.role) {
      // Block non-ADMIN users from /admin paths
      if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/403", req.url));
      }

      // Prevent access to /role if already has a role
      if (pathname === "/role") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      // Handle provider-specific verification
      if (token.role === "PROVIDER") {
        if (!token.isFaceVerified && isProviderRestrictedPath && pathname !== "/verify") {
          return NextResponse.redirect(new URL("/verify", req.url));
        }
        if (token.isFaceVerified && pathname === "/verify") {
          return NextResponse.redirect(new URL("/my-listings", req.url));
        }
      } else if (isProviderRestrictedPath) {
        // Block non-providers from provider routes
        return NextResponse.redirect(new URL("/403", req.url));
      }
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
    "/",
    "/bookings/:path*",
    "/favourites/:path*",
    "/approvals/:path*",
    "/my-listings/:path*",
    "/notifications/:path*",
    "/admin/:path*",
    "/role",
    "/verify",
    "/auth/:path*",
  ],
};