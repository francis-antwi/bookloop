// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string; // ✅ Allow role in session
    };
  }

  interface User {
    role?: string; // ✅ Allow role in user object from DB
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string; // ✅ Allow role in token
  }
}
