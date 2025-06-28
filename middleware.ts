import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ⛔ Redirect if user has no role
    if (!token?.role && pathname !== "/select-role") {
      return NextResponse.redirect(new URL("/select-role", req.url));
    }

    // ⛔ Block non-ADMIN from /admin
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // ⛔ Block non-PROVIDER from /my-listings or /approvals
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
      authorized: ({ token }) => !!token, // Require login
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
    "/role", // ensure it's accessible without role
  ],
};
