import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

// IMPORTANT: Configure Prisma Client for Edge compatibility if deploying to Vercel/Edge.
// (Keep your existing Prisma setup as discussed, only for the /role specific check)
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient(); // For Node.js runtime or local development


// Extend types to match your Prisma schema
declare module "next/server" {
  interface NextRequest {
    auth?: {
      user: {
        id: string;
        email: string;
        name: string;
        role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
        isFaceVerified: boolean;
        isOtpVerified: boolean;
        verified: boolean;
      };
      token?: JWT;
    };
  }
}

export default withAuth(
  async function middleware(req: NextRequest) { // Make the function async for Prisma query
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    // Path configuration
    const publicPaths = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
    const providerPaths = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"];
    const adminPaths = ["/admin"];
    const roleSelectionPath = "/role";
    const verificationPath = "/verify";

    // Check path categories
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    const isProviderPath = providerPaths.some(path => pathname.startsWith(path));
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
    const isRoleSelection = pathname === roleSelectionPath;
    const isVerification = pathname === verificationPath;

    // 1. Handle unauthenticated users
    if (!token) {
      if (isPublicPath || isRoleSelection || isVerification) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. Handle authenticated users

    // Block auth pages for logged-in users
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Determine the user's current role:
    // For the /role page specifically, we check the database for the freshest role.
    // For all other pages, we rely on the token.role for performance.
    let currentEffectiveRole: string | undefined | null = token.role;

    // Only query the database if the user is trying to access the /role page
    // and they are authenticated with an ID.
    if (isRoleSelection && token.id) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true }
        });
        currentEffectiveRole = user?.role || token.role; // Prioritize DB role, fallback to token
      } catch (error) {
        console.error("Database query error for /role path, falling back to token role:", error);
        // Decide how to handle this error: redirect to an error page or proceed with token role.
        // For now, it will proceed with token.role if DB fails, or you can uncomment the redirect below.
        // return NextResponse.redirect(new URL("/auth/error", req.url));
      }
    }

    // *** CRITICAL ADDITION: Redirect authenticated users without a role to the role selection page ***
    // This rule applies if they are logged in, have no role, AND are not already on the role selection
    // or verification page. It should allow redirection from public paths like '/'
    if (token && !currentEffectiveRole && pathname !== roleSelectionPath && pathname !== verificationPath) {
      return NextResponse.redirect(new URL(roleSelectionPath, req.url));
    }


    // Role selection rules: Prevent users WITH a role from accessing the /role page
    if (isRoleSelection) {
      if (currentEffectiveRole) { // If a role is set (from DB or token)
        return NextResponse.redirect(new URL("/", req.url)); // Redirect to home or dashboard
      }
      // If no role, allow to proceed to /role
      return NextResponse.next();
    }

    // Admin rules (these will continue to use `token.role`)
    if (token.role === 'ADMIN') {
      if (!isAdminPath && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // Verification rules (these will continue to use `token.role`)
    if (isVerification) {
      if (token.role === 'PROVIDER' && (token.isFaceVerified || token.verified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (token.role === 'CUSTOMER' && (token.isOtpVerified || token.verified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Provider path protection (these will continue to use `token.role`)
    if (isProviderPath) {
      if (token.role !== 'PROVIDER') {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      if (!token.isFaceVerified && !token.verified) {
        return NextResponse.redirect(new URL(verificationPath, req.url));
      }
    }

    // Admin path protection (final check for non-admin roles trying to hit admin paths)
    if (isAdminPath && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // Default: Allow request to proceed if no specific redirect rule applied
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const publicPathsForAuth = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
        const isPublicOrEntryPath = publicPathsForAuth.some(path => pathname.startsWith(path)) ||
                                     pathname === "/role" ||
                                     pathname === "/verify";

        if (!token && isPublicOrEntryPath) {
          return true;
        }

        return !!token;
      },
    },
  }
);
