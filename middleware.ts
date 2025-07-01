import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

// Extend types to match your Prisma schema
declare module "next/server" {
  interface NextRequest {
    auth?: {
      user: {
        id: string;
        email: string;
        name: string;
        role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
        isFaceVerified: boolean;
        isOtpVerified: boolean;
        verified: boolean;
      };
      token?: JWT;
    };
  }
}

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    // Path configuration
    const publicPaths = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
    const providerPaths = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"];
    const adminPaths = ["/admin"];
    const roleSelectionPath = "/role";
    const verificationPath = "/verify";

    // Check path categories
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    const isProviderPath = providerPaths.some(path => pathname.startsWith(path));
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
    const isRoleSelection = pathname === roleSelectionPath;
    const isVerification = pathname === verificationPath;

    // 1. Handle unauthenticated users
    if (!token) {
      if (isPublicPath || isRoleSelection || isVerification) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. Handle authenticated users
    const { role, isFaceVerified, isOtpVerified, verified } = token;

    // Block auth pages for logged-in users
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Admin rules
    if (role === 'ADMIN') {
      if (isRoleSelection || isVerification) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (!isAdminPath && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // Role selection rules
    if (isRoleSelection) {
      if (role) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Verification rules
    if (isVerification) {
      // Providers who are already verified
      if (role === 'PROVIDER' && (isFaceVerified || verified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      // Customers who are already verified
      if (role === 'CUSTOMER' && (isOtpVerified || verified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Provider path protection
    if (isProviderPath) {
      // Non-providers trying to access provider routes
      if (role !== 'PROVIDER') {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      // Unverified providers
      if (!isFaceVerified && !verified) {
        return NextResponse.redirect(new URL(verificationPath, req.url));
      }
    }

    // Admin path protection
    if (isAdminPath && role !== 'ADMIN') {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // Default allow for all other cases
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
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};