import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const publicPaths = ["/", "/auth", "/auth/error", "/_next", "/403"];
    const isPublic = publicPaths.some(path => pathname.startsWith(path));
    const isRolePage = pathname === "/role";
    const isVerificationPage = pathname === "/verify";
    const isProviderPage = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"]
      .some(path => pathname.startsWith(path));
    const isAdminPage = pathname.startsWith("/admin");

    if (!token) {
      if (isPublic || isRolePage || isVerificationPage) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const currentRole = token.role;

    if (!currentRole && !isRolePage && !isVerificationPage) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    if (isRolePage && currentRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (isAdminPage && currentRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    if (currentRole === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    if (isVerificationPage) {
      if (currentRole === "PROVIDER" && (token.isFaceVerified || token.verified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (currentRole === "CUSTOMER" && (token.isOtpVerified || token.verified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

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
        return !!token || allowWithoutAuth.some(path => pathname.startsWith(path));
      },
    },
  }
);

// ✅ Critical: Exclude all /api/* routes from middleware!
export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico).*)"], // ✅ fixes 401 for /api/role
};
