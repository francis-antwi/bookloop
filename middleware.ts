import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client";

declare module "next/server" {
  interface NextRequest {
    auth?: {
      user: {
        email?: string | null;
        name?: string | null;
        image?: string | null;
        role?: UserRole;
        isFaceVerified?: boolean;
        isOtpVerified?: boolean;
      };
      token?: JWT;
    };
  }
}

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    // Public paths that don't require authentication
    const publicPaths = [
      "/",
      "/auth",
      "/auth/error",
      "/api/auth",
      "/_next",
      "/403",
      "/role",
      "/verify",
    ];

    // Provider-specific protected paths
    const providerPaths = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ];

    // Admin-specific protected paths
    const adminPaths = ["/admin"];

    // Check if current path matches any of the defined path groups
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    const isProviderPath = providerPaths.some(path => pathname.startsWith(path));
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path));

    // 1. Handle unauthenticated users
    if (!token) {
      if (isPublicPath) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. Handle authenticated users

    // Prevent authenticated users from accessing auth pages
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Handle admin users
    if (token.role === UserRole.ADMIN) {
      if (pathname === "/role" || pathname === "/verify") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // Handle role selection flow
    if (pathname === "/role") {
      // Allow access only if user has no role (new Google-authenticated users)
      if (!token.role) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Handle verification flow
    if (pathname === "/verify") {
      // Providers must complete face verification
      if (token.role === UserRole.PROVIDER && !token.isFaceVerified) {
        return NextResponse.next();
      }
      // Customers must complete OTP verification
      if (token.role === UserRole.CUSTOMER && !token.isOtpVerified) {
        return NextResponse.next();
      }
      return NextResponse.redirect(
        new URL(token.role === UserRole.PROVIDER ? "/my-listings" : "/", req.url)
      );
    }

    // Protect provider-specific routes
    if (isProviderPath) {
      if (token.role !== UserRole.PROVIDER) {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      if (!token.isFaceVerified) {
        return NextResponse.redirect(new URL("/verify", req.url));
      }
    }

    // Protect admin routes
    if (isAdminPath && token.role !== UserRole.ADMIN) {
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
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};