import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const publicPaths = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
    const isPublic = publicPaths.some(path => pathname.startsWith(path));

    const isRolePage = pathname === "/role";
    const isVerificationPage = pathname === "/verify";
    const isAdminPage = pathname.startsWith("/admin");
    const isProviderPage = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"]
      .some(path => pathname.startsWith(path));

    // 🧱 1. No token: allow only public, role, or verification pages
    if (!token) {
      if (isPublic || isRolePage || isVerificationPage) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 🧱 2. Prevent logged-in users from accessing /auth (except error)
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 🔄 3. If user has no role, fetch latest from DB
    let currentRole = token.role;
    if (!currentRole && token.id) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        currentRole = user?.role ?? null;
      } catch {
        // silent fallback
      }
    }

    // 🔐 4. If user has no role, redirect to /role
    if (!currentRole && !isRolePage && !isVerificationPage) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 🔁 5. If user already has a role and visits /role, redirect to /
    if (isRolePage && currentRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 🔒 6. Admin-only page protection
    if (isAdminPage && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 🔁 7. Admins always redirected to /admin (except homepage or admin pages)
    if (token.role === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // ✅ 8. Verification checks
    if (isVerificationPage) {
      if (token.role === "PROVIDER" && (token.isFaceVerified || token.verified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (token.role === "CUSTOMER" && (token.isOtpVerified || token.verified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // 🔐 9. Restrict provider-only routes and enforce verification
    if (isProviderPage) {
      if (token.role !== "PROVIDER") {
        return NextResponse.redirect(new URL("/403", req.url));
      }
      if (!token.isFaceVerified && !token.verified) {
        return NextResponse.redirect(new URL("/verify", req.url));
      }
    }

    return NextResponse.next();
  },

  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const allowWithoutAuth = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403", "/role", "/verify"];
        return !!token || allowWithoutAuth.some(path => pathname.startsWith(path));
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
