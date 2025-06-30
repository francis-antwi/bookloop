import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    const publicPaths = ["/auth", "/auth/error", "/api/auth", "/_next"];
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

    // 1. Not logged in
    if (!token) {
      if (isPublic || pathname === "/role" || pathname === "/verify") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. If ADMIN, always redirect to home (/) from /role or /verify
    if (token.role === "ADMIN") {
      if (pathname === "/role" || pathname === "/verify") {
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
      if (!token.role) return NextResponse.next();

      if (token.role === "PROVIDER") {
        return token.isFaceVerified
          ? NextResponse.redirect(new URL("/my-listings", req.url))
          : NextResponse.redirect(new URL("/verify", req.url));
      }

      // Other roles (e.g., CUSTOMER)
      return NextResponse.redirect(new URL("/", req.url));
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
      authorized: () => true,
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
    "/auth/:path*",
    "/api/auth/:path*",
  ],
};
