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

    // 1. Unauthenticated users
    if (!token) {
      if (isPublic || isRolePage || isVerificationPage) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. Authenticated but accessing auth pages
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const currentRole = token.role;

    // 3. Force role selection if missing
    if (!currentRole && !isRolePage && !isVerificationPage) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 4. Prevent users with roles from accessing /role
    if (isRolePage && currentRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 5. Block non-admins from admin pages
    if (isAdminPage && currentRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 6. Redirect admins to admin dashboard
    if (currentRole === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // 7. Verification checks
    if (isVerificationPage) {
      if (currentRole === "PROVIDER" && (token.isFaceVerified || token.verified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (currentRole === "CUSTOMER" && (token.isOtpVerified || token.verified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // 8. Restrict provider-only pages
    if (isProviderPage) {
      if (currentRole !== "PROVIDER") {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      if (!token.isFaceVerified && !token.verified) {
        return NextResponse.redirect(new URL("/verify", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const allowWithoutAuth = [
          "/", "/auth", "/auth/error", "/_next", "/403", "/role", "/verify"
        ];
        return !!token || allowWithoutAuth.some((path) => pathname.startsWith(path));
      },
    },
  }
);

// ✅ Exclude API routes from middleware (very important)
export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};
