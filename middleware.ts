import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const publicPaths = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
    const providerPaths = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"];
    const adminPaths = ["/admin"];
    const roleSelectionPath = "/role";
    const verificationPath = "/verify";
    const apiRolePath = "/api/role"; // Define your API role path here

    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    const isProviderPath = providerPaths.some(path => pathname.startsWith(path));
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
    const isRoleSelection = pathname === roleSelectionPath;
    const isVerification = pathname === verificationPath;
    const isApiRolePath = pathname === apiRolePath; // Check if it's the API role path

    // If not authenticated
    if (!token) {
      // Allow public paths, role selection, verification, and the role API for unauthenticated users
      // (though the API route itself will handle the 'no session' error)
      if (isPublicPath || isRoleSelection || isVerification || isApiRolePath) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // Prevent logged-in users from accessing /auth (except /auth/error)
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    let currentEffectiveRole = token.role;

    // Always fetch DB role if missing in token
    if (!currentEffectiveRole && token.email) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { role: true },
        });

        currentEffectiveRole = dbUser?.role || null;

        // IMPORTANT CHANGE: Allow the /api/role endpoint to proceed even if no role is set
        // This prevents the middleware from redirecting the API call itself.
        if (isApiRolePath) {
            return NextResponse.next();
        }

        if (!currentEffectiveRole && pathname !== roleSelectionPath && pathname !== verificationPath) {
          return NextResponse.redirect(new URL(roleSelectionPath, req.url));
        } else if (currentEffectiveRole && pathname === roleSelectionPath) {
          return NextResponse.redirect(new URL("/", req.url));
        }
      } catch (err) {
        console.error("Failed to fetch user role:", err);
      }
    }

    // For /role: ensure user with role cannot access
    if (isRoleSelection) {
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { role: true },
          });

          if (dbUser?.role) {
            return NextResponse.redirect(new URL("/", req.url));
          }
        } catch (err) {
          console.error("Error checking role for /role access:", err);
        }
      }

      return NextResponse.next(); // allow if no role
    }

    // Admin logic
    if (token.role === "ADMIN") {
      if (!isAdminPath && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // Redirect providers who aren't verified
    if (isVerification) {
      if (token.role === "PROVIDER" && (token.isFaceVerified || token.verified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (token.role === "CUSTOMER" && (token.isOtpVerified || token.verified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    if (isProviderPath) {
      if (token.role !== "PROVIDER") {
        return NextResponse.redirect(new URL("/403", req.url));
      }

      if (!token.isFaceVerified && !token.verified) {
        return NextResponse.redirect(new URL(verificationPath, req.url));
      }
    }

    if (isAdminPath && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const publicPathsForAuth = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
        const isAllowedPublic = publicPathsForAuth.some(path => pathname.startsWith(path)) ||
          pathname === "/role" || pathname === "/verify" || pathname === "/api/role"; // Allow /api/role here too

        if (!token && isAllowedPublic) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
