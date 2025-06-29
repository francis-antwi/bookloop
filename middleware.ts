import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    const publicPaths = ["/", "/role", "/verify", "/auth", "/auth/error"];
    const isPublic = publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    // ✅ Allow unauthenticated access to public routes
    if (!token && isPublic) {
      return NextResponse.next();
    }

    // ⛔ Redirect users without role to role selection
    if (!token?.role && !isPublic) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // ⛔ Block unverified PROVIDERs from provider-only areas
    const providerRestrictedPaths = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
      "/admin",
    ];
    const isTryingProviderPath = providerRestrictedPaths.some((path) =>
      pathname.startsWith(path)
    );

    if (
      token?.role === "PROVIDER" &&
      !token?.isFaceVerified &&
      !isPublic &&
      isTryingProviderPath
    ) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // ⛔ Block non-ADMIN users from /admin
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// ✅ Ensure sub-paths are matched (e.g., /verify/step)
export const config = {
  matcher: [
    "/",
    "/role",
    "/verify/:path*",      // ✅ includes /verify and its children
    "/auth/:path*",        // ✅ includes /auth/error, /auth/callback/*
    "/bookings/:path*",
    "/favourites/:path*",
    "/approvals/:path*",
    "/my-listings/:path*",
    "/notifications/:path*",
    "/admin/:path*",
  ],
};
