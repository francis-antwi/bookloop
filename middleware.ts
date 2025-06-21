import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // 🚫 If user tries to access /admin and is not an admin
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url)); // 🔁 Redirect to custom 403 page
    }

    return NextResponse.next(); // ✅ Allow access
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // ✅ Protect all routes for signed-in users
    },
  }
);

export const config = {
  matcher: [
    "/bookings/:path*",
    "/favourites/:path*",
    "/approvals/:path*",
    "/my-listings/:path*",
    "/dashboard/:path*",
    "/notifications/:path*",
    "/contact/:path*",
    "/admin/:path*",
  
  ],
};
