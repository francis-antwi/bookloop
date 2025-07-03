import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // Path definitions
    const publicPaths = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
    const providerPaths = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"];
    const adminPaths = ["/admin"];
    const roleSelectionPath = "/role";
    const verificationPath = "/verify";

    // Path checks
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    const isProviderPath = providerPaths.some(path => pathname.startsWith(path));
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
    const isRoleSelection = pathname === roleSelectionPath;
    const isVerification = pathname === verificationPath;
    const isApiRoute = pathname.startsWith("/api");

    // 1. Public path handling
    if (isPublicPath && !token) {
      return NextResponse.next();
    }

    // 2. Redirect authenticated users away from auth pages
    if (pathname.startsWith("/auth") && pathname !== "/auth/error" && token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. Get fresh user data from DB when needed
    let user = null;
    if (token?.id && (isRoleSelection || isVerification || isProviderPath || isAdminPath)) {
      try {
        user = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            isFaceVerified: true,
            isOtpVerified: true,
            verified: true
          },
        });
      } catch (error) {
        console.error("Database error:", error);
      }
    }

    const currentRole = user?.role || token?.role;
    const requiresVerification = user 
      ? (currentRole === "PROVIDER" && !user.isFaceVerified && !user.verified) || 
        (currentRole === "CUSTOMER" && !user.isOtpVerified && !user.verified)
      : false;

    // 4. Role selection logic
    if (!currentRole && !isRoleSelection && !isVerification && !isPublicPath && !isApiRoute) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 5. Prevent access to role selection if already has role
    if (isRoleSelection && currentRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 6. Verification flow
    if (requiresVerification && !isVerification && !isPublicPath && !isApiRoute) {
      return NextResponse.redirect(new URL("/verify", req.url));
    }

    if (isVerification && !requiresVerification) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 7. Admin protection
    if (isAdminPath && currentRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 8. Provider protection
    if (isProviderPath && currentRole !== "PROVIDER") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // The actual authorization is handled in the middleware function
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};