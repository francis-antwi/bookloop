import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const isRolePage = pathname === "/role";
    const isVerificationPage = pathname === "/verify";

    const isProviderOnlyPage = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ].some((path) => pathname.startsWith(path));

    const isAdminPage = pathname.startsWith("/admin");

    const isPublic = [
      "/",
      "/auth",
      "/auth/error",
      "/403",
    ].some((path) => pathname.startsWith(path));

    // 1. Not authenticated → allow only public, role, or verify
    if (!token) {
      if (isPublic || isRolePage || isVerificationPage) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // Destructure token attributes
    const role = token.role;
    const isFaceVerified = token.isFaceVerified ?? false;
    const isOtpVerified = token.isOtpVerified ?? false;
    const isFullyVerified = token.verified ?? false;

    // 2. Block signed-in users from /auth except /auth/error
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. No role → allow only /role and /verify
    if (!role && !isRolePage && !isVerificationPage) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 4. Already has role → block /role
    if (role && isRolePage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 5. Admin access logic
    if (role === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // 6. Non-admin on /admin page → /403
    if (isAdminPage && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 7. /verify redirect logic
    if (isVerificationPage) {
      if (role === "PROVIDER" && (isFaceVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (role === "CUSTOMER" && (isOtpVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next(); // still verifying
    }

    // 8. Restrict provider-only pages
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
        const { pathname } = req.nextUrl;
        const allowUnauth = ["/", "/auth", "/auth/error", "/403", "/role", "/verify"];
        return !!token || allowUnauth.some((path) => pathname.startsWith(path));
      },
    },
  }
);

// ✅ Exclude static and API routes
export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};
