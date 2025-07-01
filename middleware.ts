import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

// Extend types to match your Prisma schema (keep this)
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
    const publicPaths = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"]; // Keep public paths for other checks
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

    // IMPORTANT: If no token, allow public paths and the paths where you want unauthenticated users to go initially
    // The `withAuth` wrapper will handle the redirect if `authorized` returns false and the path is not explicitly allowed.
    if (!token && !(isPublicPath || isRoleSelection || isVerification)) {
        // This condition means no token AND it's not one of the public/initial entry paths.
        // Let withAuth handle the redirect to /auth, which it will do automatically
        // and add the callbackUrl.
        // We'll then rely on the `authorized` callback below to allow /auth to pass.
    }


    // Block auth pages for logged-in users
    if (token && pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Admin rules
    if (token && token.role === 'ADMIN') { // Ensure token exists before accessing role
      if (isRoleSelection || isVerification) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (!isAdminPath && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // Role selection rules
    if (token && isRoleSelection) { // Ensure token exists
      if (token.role) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Verification rules
    if (token && isVerification) { // Ensure token exists
      // Providers who are already verified
      if (token.role === 'PROVIDER' && (token.isFaceVerified || token.verified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      // Customers who are already verified
      if (token.role === 'CUSTOMER' && (token.isOtpVerified || token.verified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Provider path protection
    if (token && isProviderPath) { // Ensure token exists
      // Non-providers trying to access provider routes
      if (token.role !== 'PROVIDER') {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      // Unverified providers
      if (!token.isFaceVerified && !token.verified) {
        return NextResponse.redirect(new URL(verificationPath, req.url));
      }
    }

    // Admin path protection (already handled by ADMIN role block above, but good to keep explicit if needed)
    if (token && isAdminPath && token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL("/403", req.url));
    }


    // Default allow for all other cases
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const publicPaths = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"]; // Match these to your public paths
        const roleSelectionPath = "/role";
        const verificationPath = "/verify";

        // Allow access to public paths, role selection, and verification paths even if unauthorized
        const isPublicOrEntryPath = publicPaths.some(path => pathname.startsWith(path)) ||
                                     pathname === roleSelectionPath ||
                                     pathname === verificationPath;

        // If no token AND it's a public/entry path, allow it to proceed.
        // Otherwise, if no token and it's NOT a public path, `withAuth` will redirect to /auth
        if (!token && isPublicOrEntryPath) {
          return true;
        }

        // For all other cases, if there's a token, consider authorized.
        // Your custom middleware function will then handle specific role-based authorizations.
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)", // Match all paths except these
  ],
};