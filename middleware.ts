import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const isRolePage = pathname === "/role";
    const isAdminPage = pathname.startsWith("/admin");
    const isProviderOnlyPage = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ].some((path) => pathname.startsWith(path));

    // 1. If not authenticated
    if (!token) {
      if (pathname.startsWith("/auth") || pathname === "/403") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    const role = token.role;
    const isFaceVerified = token.isFaceVerified ?? false;
    const isOtpVerified = token.isOtpVerified ?? false;
    const isFullyVerified = token.verified ?? false;

    // ✅ STRICT: If no role — allow ONLY /role
    if (!role) {
      if (!isRolePage) {
        return NextResponse.redirect(new URL("/role", req.url));
      }
      return NextResponse.next();
    }

    // 🔒 Block users with role from accessing /role again
    if (role && isRolePage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 🔐 Admin access
    if (role === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    if (isAdminPage && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 🔒 Provider: must be face verified
    if (isProviderOnlyPage) {
      if (role !== "PROVIDER") {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      if (!isFaceVerified && !isFullyVerified) {
        return NextResponse.redirect(new URL("/verify", req.url));
      }
    }

    // 🔁 /verify page access logic
    if (pathname === "/verify") {
      if (role === "PROVIDER" && (isFaceVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (role === "CUSTOMER" && (isOtpVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next(); // still verifying
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // ✅ Unauthenticated can only access auth and error pages
        if (!token) {
          return ["/auth", "/auth/error", "/403"].some((p) => pathname.startsWith(p));
        }

        // ✅ Users with no role can ONLY access /role
        if (!token.role) {
          return pathname === "/role";
        }

        // ✅ Everyone else passes token check
        return true;
      },
    },
  }
);

// ✅ Exclude static and API routes
export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};
