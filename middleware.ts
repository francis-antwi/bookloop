import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Allow unauthenticated access to these pages
    const publicPaths = ["/role", "/verify", "/auth", "/auth/error"];
    const isPublic = publicPaths.some(path => pathname.startsWith(path));

    // If user is not authenticated and path is public → allow
    if (!token && isPublic) {
      return NextResponse.next();
    }

    // Redirect users who have no role (but skip public pages)
    if (!token?.role && !isPublic) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // Block non-ADMIN users from /admin
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // Block non-PROVIDER users from provider-only areas
    if (
      (pathname.startsWith("/my-listings") || pathname.startsWith("/approvals")) &&
      token?.role !== "PROVIDER"
    ) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => true, // ✅ always allow middleware to run
    },
  }
);

// ✅ Protect these routes (middleware will apply here)
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
    "/auth/:path*", // includes /auth/error, /auth/callback/*
  ],
};
