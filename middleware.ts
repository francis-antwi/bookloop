import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

const PROTECTED_ROUTES = {
  admin: ["/admin"],
  provider: ["/my-listings", "/approvals"],
  user: ["/bookings", "/favourites", "/notifications"],
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Redirect unverified users to verification page
    if (token && !token.isOtpVerified && !pathname.startsWith("/auth/verify")) {
      return NextResponse.redirect(new URL("/auth/verify", req.url));
    }

    // Role-based access control
    if (pathname.startsWith(PROTECTED_ROUTES.admin[0]) {
      if (token?.role !== UserRole.ADMIN) {
        return NextResponse.redirect(new URL("/403", req.url));
      }
    }

    if (PROTECTED_ROUTES.provider.some(route => pathname.startsWith(route))) {
      if (token?.role !== UserRole.PROVIDER) {
        return NextResponse.redirect(new URL("/provider-signup", req.url));
      }
      
      // Additional provider verification check
      if (!token.isFaceVerified) {
        return NextResponse.redirect(new URL("/provider/verification", req.url));
      }
    }

    // Set security headers for all protected routes
    const response = NextResponse.next();
    
    // Security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    
    // CSP Header (adjust as needed)
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';"
    );

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Require authentication for all protected routes
        if (!token) return false;
        
        // Additional token validation
        if (!token.email || !token.role) {
          return false;
        }
        
        return true;
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
      verifyRequest: "/auth/verify",
    },
  }
);

export const config = {
  matcher: [
    ...Object.values(PROTECTED_ROUTES).flat(),
    "/settings/:path*",
    "/messages/:path*",
  ],
};