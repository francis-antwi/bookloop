import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token; // The user's token from NextAuth.js session

    // Define categories of pages for clearer logic
    const isPublicPage = ["/", "/auth", "/auth/error", "/403"].some((p) =>
      pathname.startsWith(p)
    );
    const isRolePage = pathname === "/role";
    const isVerifyPage = pathname === "/verify";
    const isAdminPage = pathname.startsWith("/admin");

    const isProviderOnlyPage = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ].some((path) => pathname.startsWith(path));

    // --- Core Redirection Logic to Prevent Loops ---

    // 1. Handle Unauthenticated Users
    // This is the first check: if there's no token, the user is not logged in.
    if (!token) {
      // If the requested page is public, allow access.
      if (isPublicPage) {
        return NextResponse.next();
      }
      // If the user tries to access any non-public page, redirect to the login page.
      // Explicitly check for "/auth" to prevent a redirect loop if the user somehow
      // ends up on "/auth" without a token and this condition triggers again.
      if (pathname === "/auth") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // --- From this point onwards, the user is authenticated (has a token) ---

    // Extract user-specific information from the token
    const role = token.role;
    const isFaceVerified = token.isFaceVerified ?? false;
    const isOtpVerified = token.isOtpVerified ?? false;
    const isFullyVerified = token.verified ?? false; // Assuming 'verified' means fully verified

    // 2. Enforce Role Selection
    // If the user has no role assigned AND they are not currently on the /role page,
    // redirect them to /role to select one.
    // The `!isRolePage` check is crucial for preventing a redirect loop on /role.
    if (!role && !isRolePage) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 3. Prevent Access to /role if Role Already Selected
    // If the user already has a role AND they are trying to access the /role page,
    // redirect them to the home page (or a dashboard) as role selection is complete.
    // This prevents them from being "stuck" or looping on the /role page.
    if (role && isRolePage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 4. Admin Access Control
    // If the user is an ADMIN:
    // - If they are trying to access a non-admin page (and it's not the root "/"),
    //   redirect them to the admin dashboard. This encourages them to use admin routes.
    if (role === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      // Otherwise, allow ADMINs to access admin pages or the root.
      return NextResponse.next();
    }

    // If the user is NOT an ADMIN but tries to access an admin page,
    // redirect them to a 403 Forbidden page.
    if (isAdminPage && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 5. Enforce Verification
    // Determine if the user needs verification based on their role and current verification status.
    const needsVerification =
      (role === "PROVIDER" && !isFaceVerified && !isFullyVerified) ||
      (role === "CUSTOMER" && !isOtpVerified && !isFullyVerified);

    // If the user needs verification AND is not currently on the /verify page,
    // redirect them to /verify.
    // The `!isVerifyPage` check is vital for preventing a redirect loop on /verify.
    if (needsVerification && !isVerifyPage) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // 6. Redirect Verified Users Away from /verify
    // If the user is on the /verify page:
    // - If a PROVIDER is verified, send them to their listings page.
    // - If a CUSTOMER is verified, send them to the home page.
    // This prevents verified users from being stuck on or looping back to the /verify page.
    if (isVerifyPage) {
      if (role === "PROVIDER" && (isFaceVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (role === "CUSTOMER" && (isOtpVerified || isFullyVerified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      // If the user is on /verify but still needs verification, allow them to stay.
      // No 'else' redirect here means they can continue the verification process.
      return NextResponse.next();
    }

    // 7. Restrict Provider-only Pages
    // If the requested page is a provider-specific page:
    if (isProviderOnlyPage) {
      // If the user is not a PROVIDER, deny access and redirect to 403.
      if (role !== "PROVIDER") {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      // If the user IS a PROVIDER but is not yet verified, redirect them to /verify.
      // This ensures providers complete verification before accessing their specific tools.
      // This redirect will be handled by conditions 5/6, which prevents a loop back
      // to the provider-only page until verification is complete.
      if (!isFaceVerified && !isFullyVerified) {
        return NextResponse.redirect(new URL("/verify", req.url));
      }
    }

    // If none of the above conditions trigger a redirect, allow the request to proceed.
    return NextResponse.next();
  },
  {
    // Callbacks for `withAuth` to handle initial authorization checks.
    // This runs BEFORE the main middleware function for protected routes.
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // Define paths that `next-auth` itself should consider public for initial checks.
        // This list should generally align with your `isPublicPage` in the main middleware.
        const publicPaths = ["/", "/auth", "/auth/error", "/403", "/role", "/verify"];

        // 1. If there's no token (user is not logged in), allow access ONLY to public paths.
        // For non-public paths, NextAuth.js will handle the redirect to its sign-in page.
        if (!token) {
          return publicPaths.some((p) => pathname.startsWith(p));
        }

        // 2. If a token exists but the user has no role, ONLY allow access to the /role page.
        // This is a critical loop prevention mechanism: it ensures the user cannot navigate
        // away from /role before selecting their role via NextAuth's internal logic.
        if (!token.role) {
          return pathname === "/role";
        }

        // For all other cases (token exists and role is present),
        // NextAuth.js considers the user authorized, and the main middleware function
        // will then handle further, more granular authorization rules.
        return true;
      },
    },
  }
);

// Configure the matcher to apply middleware to all paths except API routes,
// Next.js internal paths (_next), and favicon.
export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};