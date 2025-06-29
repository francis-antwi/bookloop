import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;


    const publicPaths = [
      "/", // Home page
      "/auth", // Authentication routes (login, register)
      "/auth/error", // Auth error page
      // Do NOT include /role or /verify here initially, as they have specific conditional access
    ];

   
    const isPublicPath = publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    // Define routes that are specifically for "PROVIDER" role and require face verification
    const providerRestrictedPaths = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ];
    const isProviderRestrictedPath = providerRestrictedPaths.some(
      (path) => pathname.startsWith(path)
    );

    // --- Order of checks is CRUCIAL to prevent loops ---

    // 1. Allow access to auth-related pages if NOT authenticated
    // This allows users to reach /auth routes if they don't have a token.
    // Also include /role and /verify here if they are entry points for unauthenticated users,
    // but with specific conditions further down.
    if (!token) {
      if (isPublicPath || pathname === "/role" || pathname.startsWith("/auth")) { // Added /role and /auth for initial unauthenticated access
        return NextResponse.next();
      }
      // If no token and not a public path, redirect to login (or /auth)
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // From this point, `token` exists (user is authenticated)

    // 2. Enforce role selection if role is missing
    // If the user is authenticated but has no role, redirect to /role.
    // Ensure this doesn't redirect *from* /role.
    if (!token.role && pathname !== "/role") {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 3. Enforce face verification for PROVIDERs on restricted paths
    // If the user is a PROVIDER, not face verified, and trying to access a provider-restricted path,
    // redirect them to /verify. Ensure this doesn't redirect *from* /verify.
    if (
      token.role === "PROVIDER" &&
      !token.isFaceVerified &&
      isProviderRestrictedPath &&
      pathname !== "/verify"
    ) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // 4. Block non-ADMIN users from /admin paths
    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url)); // Or redirect to home/dashboard
    }

    // 5. If user has a role and is verified (if PROVIDER), and not hitting other restrictions,
    // prevent access to /role or /verify if they've already fulfilled these steps.
    // This prevents logged-in, configured users from going back to these setup pages unnecessarily.
    if (token.role && pathname === "/role") {
      return NextResponse.redirect(new URL("/dashboard", req.url)); // Redirect to a sensible default dashboard
    }
    if (token.role === "PROVIDER" && token.isFaceVerified && pathname === "/verify") {
      return NextResponse.redirect(new URL("/my-listings", req.url)); // Redirect to a sensible default for verified providers
    }
     // Added for unverified users who might attempt to go to verified provider pages
    if (token.role !== "PROVIDER" && isProviderRestrictedPath) {
      return NextResponse.redirect(new URL("/403", req.url)); // Or to their specific dashboard
    }


    // Allow access if all checks pass
    return NextResponse.next();
  },
  {
    callbacks: {
      // This callback defines when `middleware` function above should run.
      // `authorized: ({ token }) => !!token` means `middleware` function will only execute
      // if a token exists (user is logged in).
      // However, to handle unauthenticated public routes correctly,
      // it's often better to let the `middleware` function run always and handle
      // unauthenticated access within the `middleware` function itself.
      // For Next-Auth v5, `withAuth`'s `authorized` callback prevents the middleware
      // from running at all if `!!token` is false.
      // To handle public routes, you need to set `authorized: () => true`
      // and handle authentication status within the `middleware` function.
      // Or, leverage the `matcher` to exclude public routes from `withAuth` entirely.

      // Let's adjust this for clarity and proper unauthenticated access.
      // If you want all paths in `matcher` to be handled by this middleware,
      // and you want `withAuth` to handle the token check *before* your function runs
      // for authenticated users, then the `authorized` callback is good for that.
      // For routes that *don't* require authentication, you would typically list them
      // separately in a `middleware.ts` without `withAuth`, or exclude them from the `matcher`.

      // Given your current `matcher` includes `/auth`, `/role`, `/verify`,
      // which sometimes need to be accessed unauthenticated or with partial auth,
      // it's simpler to let the middleware run for ALL matched paths and handle `token` status inside.
      authorized: () => true, 
    },
  }
);

export const config = {
  matcher: [
    // Include all paths that need authentication or specific role/verification checks
    "/", // Home page, might be public, but could redirect authenticated users
    "/bookings/:path*",
    "/favourites/:path*",
    "/approvals/:path*",
    "/my-listings/:path*",
    "/notifications/:path*",
    "/admin/:path*",
    "/role", // Needs to be matched for role enforcement
    "/verify", // Needs to be matched for verification enforcement
    "/auth/:path*", // Needs to be matched to allow unauthenticated access but also for redirection logic if authenticated
  ],
};