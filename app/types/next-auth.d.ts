
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

      // ✅ Extracted ID fields
      idName?: string | null;
      idNumber?: string | null;
      idDOB?: string | null;
      idExpiryDate?: string | null;
      idIssuer?: string | null;
    };
  }

  interface User {
    role?: string;
    isFaceVerified?: boolean;
    selfieImage?: string | null;
    idImage?: string | null;
    faceConfidence?: number | null;

    // ✅ Extracted ID fields
    idName?: string | null;
    idNumber?: string | null;
    idDOB?: string | null;
    idExpiryDate?: string | null;
    idIssuer?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isFaceVerified?: boolean;
    selfieImage?: string | null;
    idImage?: string | null;
    faceConfidence?: number | null;

    // ✅ Extracted ID fields
    idName?: string | null;
    idNumber?: string | null;
    idDOB?: string | null;
    idExpiryDate?: string | null;
    idIssuer?: string | null;
  }
}
