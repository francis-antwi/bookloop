import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client";

// Extend the NextRequest type to include auth
declare module "next/server" {
  interface NextRequest {
    auth?: {
      user: {
        email?: string | null;
        name?: string | null;
        image?: string | null;
        role?: "CUSTOMER" | "PROVIDER" | "ADMIN";
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

    const publicPaths = [
      "/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"
    ];
    const isPublic = publicPaths.some((path) => pathname.startsWith(path));

    const providerPaths = [
      "/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"
    ];
    const isProviderPath = providerPaths.some((path) =>
      pathname.startsWith(path)
    );

    // 1. Not logged in
    if (!token) {
      if (isPublic || pathname === "/role" || pathname === "/verify") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. Logged in — deny all users with a role from visiting /role or /verify
    if ((pathname === "/role" || pathname === "/verify") && token.role) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. Allow ADMINs full access
    if (token.role === UserRole.ADMIN) {
      return NextResponse.next();
    }

    // 4. PROVIDER-specific protection
    if (token.role === UserRole.PROVIDER) {
      if (!token.isFaceVerified && isProviderPath) {
        return NextResponse.redirect(new URL("/verify", req.url));
      }
    } else {
      // 5. Non-PROVIDER trying to access PROVIDER paths
      if (isProviderPath) {
        return NextResponse.redirect(new URL("/403", req.url));
      }
    }

    // Default: Allow
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const publicPaths = [
          "/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"
        ];
        const isPublic = publicPaths.some((path) =>
          req.nextUrl.pathname.startsWith(path)
        );

        return isPublic || !!token;
      },
    },
    matcher: [
      "/bookings/:path*",
      "/favourites/:path*",
      "/approvals/:path*",
      "/my-listings/:path*",
      "/notifications/:path*",
      "/admin/:path*",
      "/role", // actively blocked for existing users
      "/verify", // actively blocked for existing users
      "/auth/:path*",
      "/api/auth/:path*",
    ],
  }
);
