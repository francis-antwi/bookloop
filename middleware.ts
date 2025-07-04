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
    const isProviderPage = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"]
      .some(path => pathname.startsWith(path));
    const isAdminPage = pathname.startsWith("/admin");

    if (!token) {
      if (isPublic || isRolePage || isVerificationPage) return NextResponse.next();
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    if (pathname.startsWith("/auth") && pathname !== "/auth/error") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    let currentRole = token.role;
    if (isRolePage && token.id) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        currentRole = user?.role ?? token.role;
      } catch {
        currentRole = token.role;
      }
    }

    if (!currentRole && !isRolePage && !isVerificationPage) {
      return NextResponse.redirect(new URL("/role", req.url));
    }

    if (isRolePage && currentRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (isAdminPage && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    if (token.role === "ADMIN") {
      if (!isAdminPage && pathname !== "/") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    if (isVerificationPage) {
      if (token.role === "PROVIDER" && (token.isFaceVerified || token.verified)) {
        return NextResponse.redirect(new URL("/my-listings", req.url));
      }
      if (token.role === "CUSTOMER" && (token.isOtpVerified || token.verified)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

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
        return token || allowWithoutAuth.some(path => pathname.startsWith(path));
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
