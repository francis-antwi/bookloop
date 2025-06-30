export default withAuth(async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.nextauth?.token;

  const publicPaths = [
    "/auth",
    "/auth/error",
    "/api/auth",
    "/api/auth/",
    "/_next",
  ];
  const isPublic = publicPaths.some(path => pathname.startsWith(path));
  const providerPaths = ["/my-listings", "/approvals", "/bookings", "/favourites", "/notifications"];
  const isProviderPath = providerPaths.some(path => pathname.startsWith(path));

  if (!token) {
    if (isPublic || pathname === "/role" || pathname === "/verify") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  // Role guard
  if (!token.role && pathname !== "/role") {
    return NextResponse.redirect(new URL("/role", req.url));
  }

  if (token.role && pathname === "/role") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Provider verify redirect guards
  if (token.role === "PROVIDER") {
    if (token.isFaceVerified && pathname === "/verify") {
      return NextResponse.redirect(new URL("/my-listings", req.url));
    }
    if (!token.isFaceVerified && isProviderPath && pathname !== "/verify") {
      return NextResponse.redirect(new URL("/verify", req.url));
    }
  }

  // Prevent customers from going to any provider route or /verify
  if (token.role !== "PROVIDER" && (isProviderPath || pathname === "/verify")) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  // Admin-protect:
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return NextResponse.next();
}, {
  callbacks: { authorized: () => true },
});

export const config = {
  matcher: [
    "/bookings/:path*",
    "/favourites/:path*",
    "/approvals/:path*",
    "/my-listings/:path*",
    "/notifications/:path*",
    "/admin/:path*",
    "/role",
    "/verify",
    "/auth/:path*",
    "/api/auth/:path*",
  ],
};
