import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const publicPaths = ["/", "/auth", "/auth/error", "/_next", "/403"];
    const isPublic = publicPaths.some((path) => pathname.startsWith(path));
    const isRolePage = pathname === "/role";
    const isVerificationPage = pathname === "/verify";
    const isProviderPage = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"]
      .some((path) => pathname.startsWith(path));
    const isAdminPage = pathname.startsWith("/admin");

    // 1. If not authenticated
    if (!token) {
      if (isPublic || isRolePage || isVerificationPage) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    const role = token.role;
    const isFaceVerified = token.isFaceVerified ?? false;
    const isOtpVerified = token.isOtpVerified ?? false;
    const isFullyVerified = token.verified ?? false;

    // 2. Prevent logged-in users from accessing /auth
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. Require role selection
    if (!role && !isRolePage && !isVerificationPage) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 4. Prevent users with roles from accessing /role
    if (isRolePage && role) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 5. Admin checks
    if (role === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next(); // allow admins to access their dashboard
    }

    // 6. Block non-admins from admin pages
    if (isAdminPage && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 7. Verification Page Redirection
    if (isVerificationPage) {
      if (role === "PROVIDER" && (isFaceVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (role === "CUSTOMER" && (isOtpVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next(); // allow access to /verify if not verified
    }

    // 8. Restrict provider-only pages
    if (isProviderPage) {
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
        const { pathname } = req.nextUrl;
        const allowUnauth = ["/", "/auth", "/auth/error", "/_next", "/403", "/role", "/verify"];
        return !!token || allowUnauth.some((path) => pathname.startsWith(path));
      },
    },
  }
);

// ✅ Exclude static and API routes
export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};
