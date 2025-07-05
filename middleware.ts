import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const isPublicPage = ["/", "/auth", "/auth/error", "/403"].some((p) =>
      pathname.startsWith(p)
    );
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

    // 1. Not Authenticated
    if (!token) {
      if (isPublicPage) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    const role = token.role;
    const isFaceVerified = token.isFaceVerified ?? false;
    const isOtpVerified = token.isOtpVerified ?? false;
    const isFullyVerified = token.verified ?? false;

    // 2. No Role Selected — force to /role
    if (!role && !isRolePage) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 3. Already has role — block access to /role
    if (role && isRolePage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 4. Admin Logic
    if (role === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    if (isAdminPage && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 5. Verification Required — redirect to /verify
    const needsVerification =
      (role === "PROVIDER" && !isFaceVerified && !isFullyVerified) ||
      (role === "CUSTOMER" && !isOtpVerified && !isFullyVerified);

    if (needsVerification && !isVerifyPage) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // 6. Verified Users Shouldn't Stay on /verify
    if (isVerifyPage) {
      if (role === "PROVIDER" && (isFaceVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (role === "CUSTOMER" && (isOtpVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // 7. Restrict Provider-only pages
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
        const publicPaths = ["/", "/auth", "/auth/error", "/403", "/role", "/verify"];

        // 1. Allow public paths
        if (!token) return publicPaths.some((p) => pathname.startsWith(p));

        // 2. If role is missing, only allow /role
        if (!token.role) return pathname === "/role";

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};
