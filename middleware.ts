import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

// Optional: Prisma import only for /role path checks
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    // Public/static paths
    const publicPaths = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
    const providerPaths = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"];
    const adminPaths = ["/admin"];
    const roleSelectionPath = "/role";
    const verificationPath = "/verify";

    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
    const isProviderPath = providerPaths.some((path) => pathname.startsWith(path));
    const isAdminPath = adminPaths.some((path) => pathname.startsWith(path));
    const isRoleSelection = pathname === roleSelectionPath;
    const isVerification = pathname === verificationPath;

    // 1. If not logged in, allow public + role + verify pages only
    if (!token) {
      if (isPublicPath || isRoleSelection || isVerification) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 2. Authenticated but visiting /auth → redirect to home
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. Ensure role is selected
    let effectiveRole = token.role;

    // Fetch fresh role from DB only on /role page
    if (isRoleSelection && token.id) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        effectiveRole = dbUser?.role ?? token.role;
      } catch (err) {
        console.error("Error checking role in DB:", err);
      }
    }

    // ❌ No role set → force user to /role
    if (!effectiveRole && !isRoleSelection && !isVerification) {
      return NextResponse.redirect(new URL(roleSelectionPath, req.url));
    }

    // ✅ If role is already selected, block /role page
    if (isRoleSelection && effectiveRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // ✅ Admin routes
    if (isAdminPath && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // ✅ Allow ADMIN full access
    if (token.role === "ADMIN") return NextResponse.next();

    // ✅ Verification page logic
    if (isVerification) {
      if (token.role === "PROVIDER" && token.isFaceVerified) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (token.role === "CUSTOMER" && token.isOtpVerified) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // ✅ Provider protection
    if (isProviderPath) {
      if (token.role !== "PROVIDER") {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      if (!token.isFaceVerified) {
        return NextResponse.redirect(new URL(verificationPath, req.url));
      }
    }

    // ✅ Final fallback: allow access
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const isPublicOrEntry =
          pathname === "/" ||
          pathname === "/role" ||
          pathname === "/verify" ||
          pathname.startsWith("/auth") ||
          pathname.startsWith("/_next") ||
          pathname === "/403";

        // If not logged in, allow only public or auth paths
        if (!token && isPublicOrEntry) return true;

        return !!token; // Must be logged in otherwise
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
