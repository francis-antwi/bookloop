import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    if (!req.nextUrl) {
      console.error("req.nextUrl is undefined in middleware for path:", req.url);
      return NextResponse.next();
    }

    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    const publicPaths = [
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

    // === If not logged in ===
    if (!token) {
      if (isPublicPath || pathname === "/role" || pathname === "/verify") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // === If no role yet, force role selection ===
    if (!token.role && pathname !== "/role") {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // ✅ Prevent users with a role from going back to role selection
    if (token.role && pathname === "/role") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // ✅ Redirect verified PROVIDERs away from /verify
    if (token.role === "PROVIDER" && token.isFaceVerified && pathname === "/verify") {
      return NextResponse.redirect(new URL("/my-listings", req.url));
    }

    // ✅ Force unverified PROVIDERs to /verify before accessing protected areas
    if (
      token.role === "PROVIDER" &&
      !token.isFaceVerified &&
      isProviderRestrictedPath &&
      pathname !== "/verify"
    ) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // ✅ Prevent CUSTOMERs from accessing provider-only routes or /verify
    if (token.role !== "PROVIDER" && (isProviderRestrictedPath || pathname === "/verify")) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // ✅ Only ADMINs can access /admin
    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
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

// === Pages this middleware protects ===
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
    "/auth/:path*",
  ],
};
