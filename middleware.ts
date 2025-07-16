import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "./app/libs/prismadb";

// Path configuration
const PUBLIC_PATHS = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403", "/pending-approval"];
const PROVIDER_PATHS = ["/my-listings", "/approvals", "/bookings"];
const ADMIN_PATHS = ["/admin"];

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    // --- Start Middleware Debugging Logs ---
    console.log(`\n--- Middleware Check for Path: ${pathname} ---`);
    console.log(`Token ID: ${token?.id}`);
    console.log(`Is Authenticated (via token): ${!!token}`);
    // --- End Middleware Debugging Logs ---

    // 1. Skip middleware for public paths (including auth routes, errors, and static assets via _next)
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // 2. Redirect authenticated users away from auth pages (unless it's the error page)
    if (token && pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. Skip further checks for API routes not explicitly handled as public
    if (pathname.startsWith("/api")) {
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
          requiresApproval: true,
        },
      });
    }

    const currentRole = currentUser?.role || token?.role || null;
    const isVerified = currentUser?.verified || token?.verified || false;
    const requiresApproval = currentUser?.requiresApproval || false;

    // --- More Detailed Middleware Debugging Logs ---
    console.log(`Current Role (DB/Token): ${currentRole}`);
    console.log(`Is Verified (DB/Token): ${isVerified}`);
    console.log(`Requires Approval (DB): ${requiresApproval}`);
    console.log(`--- End Detailed Middleware Check ---\n`);
    // --- End Detailed Middleware Debugging Logs ---

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

    // 8. Verification flow for providers
    if (currentRole === "PROVIDER") {
        // Scenario A: Provider is fully approved (verified and no longer requires approval)
        if (isVerified && !requiresApproval) {
            // If they are on the root, verification, or pending page, redirect them to their main dashboard
            if (pathname === "/" || pathname === "/verify" || pathname === "/pending-approval") {
                console.log("-> PROVIDER: Fully approved, redirecting from root/verification/pending to /my-listings");
                return NextResponse.redirect(new URL("/my-listings", req.url));
            }
            // Otherwise, allow them to proceed to any page (including PROVIDER_PATHS)
            console.log("-> PROVIDER: Fully approved, allowing access.");
            return NextResponse.next();
        } 
        // Scenario B: Provider is NOT fully approved (either not verified OR still requires approval)
        else {
            // Define allowed paths for not fully verified providers
            const allowedProviderPendingPaths = ["/verify", "/pending-approval"];

            // If the current path is NOT one of the allowed pending paths
            if (!allowedProviderPendingPaths.includes(pathname)) {
                // Determine the correct redirect target
                if (!isVerified) { // Not even frontend verified yet (e.g., just registered as PROVIDER)
                    console.log("-> PROVIDER: Not verified, redirecting to /verify.");
                    return NextResponse.redirect(new URL("/verify", req.url));
                } else { // Frontend verified, but requires admin approval
                    console.log("-> PROVIDER: Verified but requires approval, redirecting to /pending-approval.");
                    return NextResponse.redirect(new URL("/pending-approval", req.url));
                }
            }
            // If they are on an explicitly allowed pending path (/verify or /pending-approval), let them proceed
            console.log(`-> PROVIDER: Not fully approved, on allowed pending path (${pathname}). Allowing access.`);
            return NextResponse.next();
        }
    }

    // 9. Customers should not access verification page if already verified
    if (currentRole === "CUSTOMER" && pathname === "/verify" && isVerified) {
      console.log("-> CUSTOMER: Already verified, redirecting from /verify to /.");
      return NextResponse.redirect(new URL("/", req.url));
    }

    // If none of the above conditions trigger a redirect or early exit, allow the request to proceed.
    console.log("-> Allowing request to proceed.");
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
