import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt"; // Import JWT type if you're directly using it

// Extend the NextRequest type to include the 'auth' property provided by next-auth
declare module "next/server" {
  interface NextRequest {
    auth?: {
      user: {
        email?: string | null;
        name?: string | null;
        image?: string | null;
        role?: "CUSTOMER" | "PROVIDER" | "ADMIN"; // Define your roles
        isFaceVerified?: boolean;
      };
      token?: JWT; // If you're explicitly passing the JWT token through callbacks
    };
  }
}

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    // Access the session/token directly from req.auth
    const token = req.auth?.token; // Access the raw JWT token if you've configured it in callbacks
    const user = req.auth?.user; // Or access the user object directly

    // Decide whether to use `token` (raw JWT) or `user` (session user) for your logic.
    // Given your original code used `token.role` and `token.isFaceVerified`,
    // it implies you are passing a custom `token` object through the JWT callback.
    // Let's assume you want to work with the `token` directly as per your original code's structure.

    const publicPaths = [
      "/", // Often the home page is public
      "/auth",
      "/auth/error",
      "/api/auth",
      "/_next",
      "/403", // Your access denied page
    ];
    const isPublic = publicPaths.some((path) => pathname.startsWith(path));

    const providerPaths = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ];
    const isProviderPath = providerPaths.some((path) =>
      pathname.startsWith(path)
    );

    const isVerifiedProvider =
      token?.role === "PROVIDER" && token?.isFaceVerified === true;

    // 1. Not logged in (no token)
    if (!token) {
      if (isPublic || pathname === "/role" || pathname === "/verify") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. If admin, allow full access and redirect /role to home
    if (token.role === "ADMIN") {
      if (pathname === "/role") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // 3. Logged in but no role set yet → only allow access to /role
    if (!token.role && pathname !== "/role") {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 4. Access to /role
    if (pathname === "/role") {
      // Allow if user has no role yet
      if (!token.role) {
        return NextResponse.next();
      }

      // Redirect based on existing role
      if (token.role === "PROVIDER") {
        return token.isFaceVerified
          ? NextResponse.redirect(new URL("/my-listings", req.url))
          : NextResponse.redirect(new URL("/verify", req.url));
      }

      return NextResponse.redirect(new URL("/", req.url)); // CUSTOMER and other roles
    }

    // 5. Verified PROVIDER should not access /verify again
    if (pathname === "/verify" && isVerifiedProvider) {
      return NextResponse.redirect(new URL("/my-listings", req.url));
    }

    // 6. Unverified PROVIDER accessing protected provider pages (except /verify)
    if (
      token.role === "PROVIDER" &&
      !token.isFaceVerified &&
      isProviderPath &&
      pathname !== "/verify"
    ) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // 7. Non-provider trying to access provider-only paths or /verify
    if (
      token.role !== "PROVIDER" &&
      (isProviderPath || pathname === "/verify")
    ) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // The `authorized` callback determines if the user is authenticated for the path.
      // Returning `true` here means that `next-auth` will not block the request
      // and will proceed to execute your `middleware` function. You then handle
      // all redirection/authorization logic within your `middleware` function.
      authorized: ({ token, req }) => {
        // If the path is public, always allow access.
        const publicPaths = [
          "/",
          "/auth",
          "/auth/error",
          "/api/auth",
          "/_next",
          "/403",
        ];
        const isPublic = publicPaths.some((path) =>
          req.nextUrl.pathname.startsWith(path)
        );

        if (isPublic) {
          return true; // Allow access to public paths
        }

        // For all other paths, require a token (i.e., user must be logged in)
        return !!token;
      },
    },
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
    "/auth/:path*", // Include auth paths for redirection logic within middleware
    "/api/auth/:path*", // NextAuth.js API routes are handled internally but sometimes included here
    "/", // Include the root path if you have protected content there
    "/403", // Include your 403 page
  ],
};