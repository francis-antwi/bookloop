import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Public routes anyone can visit
    const publicPaths = ["/", "/auth", "/auth/error", "/role", "/verify"];
    const isPublic = publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    const isProviderOnlyPath = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ].some((path) => pathname.startsWith(path));

    // ✅ Allow unauthenticated access to public routes
    if (!token && isPublic) {
      return NextResponse.next();
    }

    // ⛔ Require role selection
    if (!token?.role && pathname !== "/role") {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // ⛔ Restrict PROVIDER pages if not verified
    if (
      token?.role === "PROVIDER" &&
      !token?.isFaceVerified &&
      isProviderOnlyPath &&
      pathname !== "/verify"
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
      authorized: ({ token }) => !!token, // Allow middleware to run for logged-in users
    },
  }
);

// ✅ Middleware applies to these pages
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
