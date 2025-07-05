import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const isRolePage = pathname === "/role";
    const isVerifyPage = pathname === "/verify";
    const isAdminPage = pathname.startsWith("/admin");
    const isProviderOnlyPage = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ].some((path) => pathname.startsWith(path));

    // 1. Not authenticated: allow public pages
    if (!token) {
      const publicPaths = ["/", "/auth", "/auth/error", "/403"];
      if (publicPaths.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    const role = token.role;
    const isFaceVerified = token.isFaceVerified ?? false;
    const isOtpVerified = token.isOtpVerified ?? false;
    const isFullyVerified = token.verified ?? false;

    // 2. No role selected: force /role even if on "/"
    if (!role && !isRolePage) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 3. Block /role if already has role
    if (role && isRolePage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 4. Admin routing
    if (role === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    if (isAdminPage && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 5. Verification check
    if (role === "PROVIDER" && !isFaceVerified && !isFullyVerified && !isVerifyPage) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    if (role === "CUSTOMER" && !isOtpVerified && !isFullyVerified && !isVerifyPage) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // 6. Verified users shouldn't revisit /verify
    if (isVerifyPage) {
      if (role === "PROVIDER" && (isFaceVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (role === "CUSTOMER" && (isOtpVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // 7. Provider-only route protection
    if (isProviderOnlyPage) {
      if (role !== "PROVIDER") {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      if (!isFaceVerified && !isFullyVerified) {
        return NextResponse.redirect(new URL("/verify", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const publicPaths = ["/", "/auth", "/auth/error", "/403"];

        if (!token) return publicPaths.some((p) => pathname.startsWith(p));
        if (!token.role) return pathname === "/role";

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};
