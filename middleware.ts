import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    const publicPaths = ["/auth", "/auth/error", "/api/auth", "/_next"];
    const isPublic = publicPaths.some(path => pathname.startsWith(path));

    const providerPaths = [
      "/my-listings",
      "/approvals",
      "/bookings",
      "/favourites",
      "/notifications",
    ];
    const isProviderPath = providerPaths.some(path =>
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

    // 2. Logged in but no role set yet
    if (!token.role && pathname !== "/role") {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 3. Handle role access rules
    if (pathname === "/role") {
      if (token.role === "PROVIDER") {
        return token.isFaceVerified
          ? NextResponse.redirect(new URL("/my-listings", req.url))
          : NextResponse.redirect(new URL("/verify", req.url));
      }
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 4. PROVIDER not verified trying to access provider pages (not /verify)
    if (
      token.role === "PROVIDER" &&
      !token.isFaceVerified &&
      isProviderPath &&
      pathname !== "/verify"
    ) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    // 5. CUSTOMER or other roles trying to access provider-only pages or /verify
    if (
      token.role !== "PROVIDER" &&
      (isProviderPath || pathname === "/verify")
    ) {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 6. Admin protection
    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
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
 
   ,
  ],
};
