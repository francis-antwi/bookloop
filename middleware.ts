import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    const publicPaths = ["/", "/role", "/verify", "/auth", "/auth/error"];
    const isPublic = publicPaths.some((path) =>
      pathname === path || pathname.startsWith(`${path}/`)
    );

    // ✅ Allow unauthenticated access to public routes
    if (!token && isPublic) {
      return NextResponse.next();
    }

    // ⛔ Redirect users without role to role selection (but not if already on /role)
    if (!token?.role && pathname !== "/role") {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // ⛔ Block unverified PROVIDERs from provider-only areas
    const isRestrictedProviderRoute =
      pathname.startsWith("/my-listings") ||
      pathname.startsWith("/approvals");

    if (
      token?.role === "PROVIDER" &&
      !token?.isFaceVerified &&
      isRestrictedProviderRoute
    ) {
      // ✅ Don’t redirect again if already on /verify
      if (pathname !== "/verify") {
        return NextResponse.redirect(new URL("/verify", req.url));
      }
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
    "/", // ✅ Home page
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
