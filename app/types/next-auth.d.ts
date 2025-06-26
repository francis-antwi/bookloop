// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      isFaceVerified?: boolean;
      selfieImage?: string | null;
      idImage?: string | null;
      faceConfidence?: number | null;
    };
  }

  interface User {
    role?: string;
    isFaceVerified?: boolean;
    selfieImage?: string | null;
    idImage?: string | null;
    faceConfidence?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isFaceVerified?: boolean;
    selfieImage?: string | null;
    idImage?: string | null;
    faceConfidence?: number | null;
  }
}
