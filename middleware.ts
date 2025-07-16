import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "./app/libs/prismadb";

// Path configuration
const PUBLIC_PATHS = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"]; // Keep /_next for clarity, though matcher handles it.
const PROVIDER_PATHS = ["/my-listings", "/approvals", "/bookings"];
const ADMIN_PATHS = ["/admin"];

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    // 1. Skip middleware for public paths (including auth routes, errors, and static assets via _next)
    // The `matcher` config handles most static files, but this provides an explicit early exit for defined public paths.
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // 2. Redirect authenticated users away from auth pages (unless it's the error page)
    if (token && pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. Skip further checks for API routes not explicitly handled as public
    // (e.g., protected API routes will be handled by next-auth or later in this middleware if they require specific roles/verifications)
    if (pathname.startsWith("/api")) { // Note: "/api/auth" is already in PUBLIC_PATHS
      return NextResponse.next();
    }

    // 4. Get user data from database if a token ID exists
    let currentUser = null;
    if (token?.id) {
      currentUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: {
          role: true,
          verified: true,
          isFaceVerified: true,
          requiresApproval: true,
        },
      });
    }

    const currentRole = currentUser?.role || token?.role || null;
    const isVerified = currentUser?.verified || token?.verified || false;
    const isFaceVerified = currentUser?.isFaceVerified || token?.isFaceVerified || false;
    const requiresApproval = currentUser?.requiresApproval || false;

    // 5. Handle role assignment flow: Redirect to role selection if no role assigned
    if (!currentRole && !["/role", "/verify"].includes(pathname)) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 6. Prevent access to role page if user already has a role
    if (pathname === "/role" && currentRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 7. Admin-specific routing: Restrict non-admins from admin paths
    if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
      if (currentRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      return NextResponse.next(); // Allow ADMINs to proceed to admin paths
    }

    // Corrected: Removed the rule that forces Admins to only /admin.
    // Admins can now access other parts of the application as well.
    // If specific non-admin routes should be inaccessible to Admins,
    // that logic would need to be added here.

    // 8. Verification flow for providers
    if (currentRole === "PROVIDER") {
      // If on verification page but already fully verified
      if (pathname === "/verify" && isFaceVerified && isVerified && !requiresApproval) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }

      // If trying to access provider-specific pages without full verification
      if (PROVIDER_PATHS.some(path => pathname.startsWith(path))) {
        if (!isFaceVerified || !isVerified || requiresApproval) {
          return NextResponse.redirect(new URL("/verify", req.url));
        }
      }

      // If a provider is not verified and is trying to access any page other than /verify
      if ((!isFaceVerified || !isVerified || requiresApproval) && pathname !== "/verify") {
        return NextResponse.redirect(new URL("/verify", req.url));
      }
    }

    // 9. Customers should not access verification page if already verified
    // This assumes 'isVerified' for a CUSTOMER means they don't need the '/verify' process.
    if (currentRole === "CUSTOMER" && pathname === "/verify" && isVerified) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // If none of the above conditions trigger a redirect or early exit, allow the request to proceed.
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Paths that do NOT require authentication. This is crucial for next-auth.
        const allowWithoutAuth = [...PUBLIC_PATHS, "/role", "/verify"];
        return !!token || allowWithoutAuth.some(path => pathname.startsWith(path));
      },
    },
  }
);

export const config = {
  // Match all paths except API routes, static files, and favicon.ico
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};