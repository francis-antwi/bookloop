import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

declare module "next/server" {
  interface NextRequest {
    auth?: {
      user: {
        id: string;
        email: string;
        name: string;
        role: "CUSTOMER" | "PROVIDER" | "ADMIN";
        isFaceVerified: boolean;
        isOtpVerified: boolean;
        verified: boolean;
      };
      token?: JWT;
    };
  }
}

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const publicPaths = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
    const providerPaths = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"];
    const adminPaths = ["/admin"];
    const roleSelectionPath = "/role";
    const verificationPath = "/verify";

    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    const isProviderPath = providerPaths.some(path => pathname.startsWith(path));
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
    const isRoleSelection = pathname === roleSelectionPath;
    const isVerification = pathname === verificationPath;

    // 1. Unauthenticated users
    if (!token) {
      if (isPublicPath || isRoleSelection || isVerification) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. Prevent access to auth pages if already logged in
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. Get current effective role
    let currentEffectiveRole: string | undefined | null = token.role;

    // For role page, get freshest role from DB
    if (isRoleSelection && token.id) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        currentEffectiveRole = user?.role || token.role;
      } catch (error) {
        console.error("Error checking role from DB:", error);
      }
    }

    // 4. Redirect users with no role to /role (except /role, /verify, and API routes)
    if (
      (!token.role || token.role === "null") &&
      pathname !== roleSelectionPath &&
      pathname !== verificationPath &&
      !pathname.startsWith("/api")
    ) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 5. If user has role, block access to /role
    if (isRoleSelection && currentEffectiveRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 6. Admin protection
    if (token.role === "ADMIN") {
      if (!isAdminPath && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // 7. Verification logic
    if (isVerification) {
      if (token.role === "PROVIDER" && (token.isFaceVerified || token.verified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (token.role === "CUSTOMER" && (token.isOtpVerified || token.verified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // 8. Provider access rules
    if (isProviderPath) {
      if (token.role !== "PROVIDER") {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      if (!token.isFaceVerified && !token.verified) {
        return NextResponse.redirect(new URL(verificationPath, req.url));
      }
    }

    // 9. Block non-admin users from admin routes
    if (isAdminPath && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 10. Allow request to continue
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const publicPathsForAuth = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
        const isPublic = publicPathsForAuth.some(path => pathname.startsWith(path)) ||
          pathname === "/role" || pathname === "/verify";

        if (!token && isPublic) return true;

        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
