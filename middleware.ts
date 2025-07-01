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

    // --- DEBUG LOGGING START ---
    if (process.env.NODE_ENV === "development") {
      console.log(`[MIDDLEWARE] Pathname: ${pathname}`);
      console.log(`[MIDDLEWARE] Token presence: ${!!token}`);
      if (token) {
        console.log(`[MIDDLEWARE] Token ID: ${token.id}`); // Log user ID for better tracking
        console.log(`[MIDDLEWARE] Token email: ${token.email}`);
        console.log(`[MIDDLEWARE] Token role: ${token.role}`);
        console.log(`[MIDDLEWARE] Token isFaceVerified: ${token.isFaceVerified}`);
        console.log(`[MIDDLEWARE] Token isOtpVerified: ${token.isOtpVerified}`);
      }
    }
    // --- DEBUG LOGGING END ---

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
      if (process.env.NODE_ENV === "development") {
        console.log(`[MIDDLEWARE] No token. Is public path for unauth: ${isPublicForUnauth}`);
      }
      return isPublicForUnauth
        ? NextResponse.next()
        : NextResponse.redirect(new URL("/auth", req.url));
    }

    // 🟩 2. Logged in

    // Check if user has a role. If not, force redirect to /role unless already on /role.
    const hasRole =
      token.role === UserRole.CUSTOMER ||
      token.role === UserRole.PROVIDER ||
      token.role === UserRole.ADMIN;

    if (!hasRole && pathname !== "/role") {
      if (process.env.NODE_ENV === "development") {
        console.log(`[MIDDLEWARE] Logged in user with no role trying to access ${pathname}. Redirecting to /role`);
      }
      return NextResponse.redirect(new URL("/role", req.url));
    }


    // Prevent logged-in users from visiting login/signup pages (except /auth/error)
    // This rule should come AFTER the no-role check, so users without a role
    // are still directed to /role even if they try to go to /auth.
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      if (process.env.NODE_ENV === "development") {
        console.log(`[MIDDLEWARE] Logged in user trying to access auth page. Redirecting to /`);
      }
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 🟦 Allow /role ONLY if no role is set yet
    // This block is now simplified because the earlier check handles redirects away from /role
    // if a role is present. Here, we just allow access if no role.
    if (pathname === "/role") {
      if (!hasRole) { // If no role, allow them to stay on /role
        if (process.env.NODE_ENV === "development") {
          console.log(`[MIDDLEWARE] On /role page. No role set. Allowing access.`);
        }
        return NextResponse.next();
      } else { // If they have a role, redirect them away from /role
        if (process.env.NODE_ENV === "development") {
          console.log(`[MIDDLEWARE] On /role page. Role already set (${token.role}). Redirecting to /`);
        }
        return NextResponse.redirect(new URL("/", req.url));
      }
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
          "/", "/auth", "/auth/error", "/_next", "/403", "/role", "/verify"
        ];
        const isPublic = safePaths.some((path) =>
          req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(path)
        );
        // Crucial: Allow all NextAuth.js API routes to process without requiring a token
        const isNextAuthApiRoute = req.nextUrl.pathname.startsWith("/api/auth");

        // Allow access if it's a public path OR a NextAuth.js API route OR if there's a token
        return isPublic || isNextAuthApiRoute || !!token;
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
      "/api/auth/:path*", // Keep this in matcher so middleware runs for auth routes
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
