import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    const publicPaths = ["/", "/role", "/verify", "/auth", "/auth/error"];
    const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

    // ✅ Allow unauthenticated access to public routes
    if (!token && isPublic) {
      return NextResponse.next();
    }

    // ⛔ Redirect users without role to role selection
    if (!token?.role && !isPublic) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // ⛔ Block unverified PROVIDERs from provider-only areas, allow home page `/`
    if (
      token?.role === "PROVIDER" &&
      !token?.isFaceVerified &&
      !isPublic &&
      (pathname.startsWith("/my-listings") ||
        pathname.startsWith("/approvals") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/bookings") ||
        pathname.startsWith("/favourites") ||
        pathname.startsWith("/notifications"))
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

export const config = {
  matcher: [
    "/", // ✅ Explicitly match `/`
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
