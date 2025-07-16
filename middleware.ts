import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/app/libs/prismadb";

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.auth?.token;

    const publicPaths = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403"];
    const isPublic = publicPaths.some(path => pathname.startsWith(path));
    const isRolePage = pathname === "/role";
    const isVerificationPage = pathname === "/verify";
    const isPendingApprovalPage = pathname === "/pending-approval";
    const isAdminPage = pathname.startsWith("/admin");
    const isProviderPage = ["/my-listings", "/approvals", "/bookings"].some(path => pathname.startsWith(path));

    // 🧱 1. Not authenticated
    if (!token) {
      if (isPublic || isRolePage || isVerificationPage || isPendingApprovalPage) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    // 🧱 2. Already authenticated, block /auth (except error)
    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 🔄 3. Get latest user role and verification status from DB
    let currentRole = token.role;
    let isVerified = token.verified;
    let isFaceVerified = token.isFaceVerified;
    let requiresApproval = false;
    let isBusinessVerified = false;

    if (token.id) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            verified: true,
            isFaceVerified: true,
            requiresApproval: true,
            businessVerified: true, // ✅ include
          },
        });

        currentRole = user?.role ?? null;
        isVerified = user?.verified ?? false;
        isFaceVerified = user?.isFaceVerified ?? false;
        requiresApproval = user?.requiresApproval ?? false;
        isBusinessVerified = user?.businessVerified ?? false;
      } catch (err) {
        console.error("❌ Failed to fetch user from DB:", err);
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
      if (currentRole === "PROVIDER" && (isFaceVerified || isVerified)) {
        if (requiresApproval || !isBusinessVerified) {
          return NextResponse.redirect(new URL("/pending-approval", req.url));
        }
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }

      if (currentRole === "CUSTOMER" && isVerified) {
        return NextResponse.redirect(new URL("/", req.url));
      }

      return NextResponse.next();
    }

    // 🔒 9. Restrict provider-only pages and enforce full approval + business verified
    if (isProviderPage) {
      if (currentRole !== "PROVIDER") {
        return NextResponse.redirect(new URL("/403", req.url));
      }

      if (!isFaceVerified && !isVerified) {
        return NextResponse.redirect(new URL("/verify", req.url));
      }

      if ((isFaceVerified || isVerified) && (requiresApproval || !isBusinessVerified)) {
        return NextResponse.redirect(new URL("/pending-approval", req.url));
      }
    }

    // 🔄 10. If provider tries accessing / or /verify or /pending-approval after full approval, redirect to /my-listings
    if (currentRole === "PROVIDER" && (isFaceVerified || isVerified) && !requiresApproval && isBusinessVerified) {
      const unnecessaryPaths = ["/", "/verify", "/pending-approval"];
      if (unnecessaryPaths.includes(pathname)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
    }

    return NextResponse.next();
  },

  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const allowWithoutAuth = ["/", "/auth", "/auth/error", "/api/auth", "/_next", "/403", "/role", "/verify", "/pending-approval"];
        return !!token || allowWithoutAuth.some(path => pathname.startsWith(path));
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
