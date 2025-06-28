import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ⛔ Redirect users who have no role, except for unprotected pages
    if (!token?.role) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // ⛔ Block non-ADMIN users from /admin
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // ⛔ Block non-PROVIDER users from /my-listings or /approvals
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
      authorized: ({ token }) => !!token, // require login
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
    // ❌ do NOT include /role, /verify, or /auth — these stay fully public
  ],
};
