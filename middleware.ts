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

    const publicPathsForUnauth = [
      "/", "/auth", "/auth/error", "/api/auth", "/_next", "/403", "/role", "/verify"
    ];
    const isPublicForUnauth = publicPathsForUnauth.some((path) =>
      pathname === path || pathname.startsWith(path)
    );

    const providerPaths = [
      "/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"
    ];
    const isProviderProtectedPath = providerPaths.some((path) =>
      pathname.startsWith(path)
    );

    // 🟥 1. Not logged in
    if (!token) {
      return isPublicForUnauth
        ? NextResponse.next()
        : NextResponse.redirect(new URL("/auth", req.url));
    }

    // 🟩 2. Logged in

    // Prevent logged-in users from visiting login/signup pages (except /auth/error)
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 🟦 Allow /role ONLY if no role is set yet
    if (pathname === "/role") {
      const hasRole =
        token.role === UserRole.CUSTOMER ||
        token.role === UserRole.PROVIDER ||
        token.role === UserRole.ADMIN;

      if (hasRole) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next(); // allow user with no role
    }

    // 🟨 /verify logic
    if (pathname === "/verify") {
      if (token.role === UserRole.PROVIDER && token.isFaceVerified) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (token.role === UserRole.CUSTOMER && token.isOtpVerified) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next(); // allow if still needs verification
    }

    // 🟪 Admins: all access except /role or /verify
    if (token.role === UserRole.ADMIN) {
      if (pathname === "/role" || pathname === "/verify") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // 🟧 Provider routes
    if (
      token.role === UserRole.PROVIDER &&
      !token.isFaceVerified &&
      isProviderProtectedPath
    ) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    if (
      token.role !== UserRole.PROVIDER &&
      isProviderProtectedPath
    ) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const safePaths = [
          "/", "/auth", "/auth/error", "/api/auth", "/_next", "/403", "/role", "/verify"
        ];
        const isPublic = safePaths.some((path) =>
          req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(path)
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
      "/role",
      "/verify",
      "/auth/:path*",
      "/api/auth/:path*",
    ],
  }
);

export const config = {
  matcher: [
    "/bookings/:path*",
    "/favourites/:path*",
    "/approvals/:path*",
    "/my-listings/:path*",
    "/notifications/:path*",
    "/admin/:path*",
    "/role",
    "/verify",
    "/auth/:path*",
    "/api/auth/:path*",
  ],
};
