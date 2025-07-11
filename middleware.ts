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
    const isProviderPage = [
      "/my-listings",
      "/approvals",
      "/bookings",
      
    ].some(path => pathname.startsWith(path));

    // 🧱 1. Not authenticated
    if (!token) {
      if (isPublic || isRolePage || isVerificationPage) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 🧱 2. Already authenticated, block /auth (except error)
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 🔄 3. Get role from token or DB
    let currentRole = token.role;
    if (!currentRole && token.id) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        currentRole = user?.role ?? null;
      } catch (err) {
        console.error("❌ Failed to fetch user role from DB:", err);
      }
    }

    // 🔐 4. Redirect to /role if no role
    if (!currentRole && !isRolePage && !isVerificationPage) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    // 🔁 5. Prevent role page if already has role
    if (isRolePage && currentRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 🔒 6. Restrict /admin to ADMIN only
    if (isAdminPage && currentRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    // 🧭 7. Redirect ADMINs to /admin unless on home or admin page
    if (currentRole === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // ✅ 8. Verification logic for /verify
    if (isVerificationPage) {
      if (currentRole === "PROVIDER" && (token.isFaceVerified || token.verified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (currentRole === "CUSTOMER" && (token.isOtpVerified || token.verified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // 🔐 9. Restrict provider-only pages and enforce verification
    if (isProviderPage) {
      if (currentRole !== "PROVIDER") {
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
