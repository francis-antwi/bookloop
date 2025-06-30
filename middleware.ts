import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client";

// Extend the NextRequest type to include the 'auth' property provided by next-auth
declare module "next/server" {
  interface NextRequest {
    auth?: {
      user: {
        email?: string | null;
        name?: string | null;
        image?: string | null;
        role?: "CUSTOMER" | "PROVIDER" | "ADMIN";
        isFaceVerified?: boolean;
        isOtpVerified?: boolean; // Added for clarity in middleware type
      };
      token?: JWT;
    };
  }
}

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    // Define paths that are publicly accessible (for unauthenticated users)
    const publicPathsForUnauth = [
      "/", // Home page
      "/auth", // Authentication pages (login, register)
      "/auth/error", // Authentication error page
      "/api/auth", // NextAuth.js API routes
      "/_next", // Next.js internal paths
      "/403", // Access denied page
      "/role", // Allow unauthenticated to access /role for initial setup (e.g., new Google users)
      "/verify", // Allow unauthenticated to access /verify for initial setup
    ];
    const isPublicForUnauth = publicPathsForUnauth.some((path) => pathname.startsWith(path));

    // Define paths that are specific to providers (protected paths)
    const providerPaths = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ];
    const isProviderProtectedPath = providerPaths.some((path) =>
      pathname.startsWith(path)
    );

    // --- Redirection Logic ---

    // 1. If user is NOT logged in (no token)
    if (!token) {
      if (isPublicForUnauth) {
        return NextResponse.next(); // Allow access to public paths for unauthenticated users
      }
      // For any other non-public path, redirect to login
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. If user IS logged in (token exists)

    // Logged-in users should not access authentication pages. Redirect to home.
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // If user is an ADMIN, they have full access. If they try to go to /role or /verify, redirect them to home.
    if (token.role === UserRole.ADMIN) {
      if (pathname === "/role" || pathname === "/verify") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next(); // Allow ADMINs to access any other path
    }

    // For all other logged-in users (CUSTOMER or PROVIDER):

    // If user is on /role page and they are logged in, redirect them to home.
    // This assumes all existing users have roles and should not revisit this page.
    if (pathname === "/role") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // If user is on /verify page
    if (pathname === "/verify") {
      // If user is a PROVIDER and already face verified, redirect them away from /verify to their dashboard.
      if (token.role === UserRole.PROVIDER && token.isFaceVerified) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      // If user is a CUSTOMER and already OTP verified, redirect them away from /verify to home.
      if (token.role === UserRole.CUSTOMER && token.isOtpVerified) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      // If the user is genuinely unverified (based on their role) and on /verify, allow them to proceed.
      return NextResponse.next();
    }

    // --- Protection for specific routes based on role/verification status ---

    // If a PROVIDER is not face verified and tries to access a provider-specific path, force them to verify.
    if (token.role === UserRole.PROVIDER && !token.isFaceVerified && isProviderProtectedPath) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // If a non-PROVIDER tries to access a provider-specific path, deny access.
    if (token.role !== UserRole.PROVIDER && isProviderProtectedPath) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // --- Catch-all redirect to / for authenticated users ---
    // If the user is logged in, not an ADMIN, not on /role or /verify (and not needing them),
    // and not trying to access a protected path they are unauthorized for,
    // and not currently on the root path or a public path they should stay on, redirect them to the root path.
    if (token && pathname !== "/" && !publicPathsForUnauth.includes(pathname) && !isProviderProtectedPath) {
        return NextResponse.redirect(new URL("/", req.url));
    }
    // --- END NEW LOGIC ---

    // Default: Allow access if no specific redirection or protection rules are met
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const publicPathsForAuthCheck = [
          "/",
          "/auth",
          "/auth/error",
          "/api/auth",
          "/_next",
          "/403",
          "/role", // Include /role and /verify here to allow NextAuth to pass them to the middleware function
          "/verify",
        ];
        const isPublicForAuthCheck = publicPathsForAuthCheck.some((path) =>
          req.nextUrl.pathname.startsWith(path)
        );

        if (isPublicForAuthCheck) {
          return true; // Always allow access to these paths (middleware will handle specific redirects)
        }
        return !!token; // For all other paths, require a token (user must be logged in)
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
      "/",
      "/403",
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
    "/",
    "/403",
  ],
};
