import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;

      // ✅ OTP fields
      isOtpVerified?: boolean;
      otpCode?: string | null;
      otpExpiresAt?: string | null;

      // ✅ Face verification
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

      // ✅ NEW: Additional ID fields
      personalIdNumber?: string | null;
      idIssueDate?: string | null;
    };
  }

  interface User {
    role?: string;

    // ✅ OTP fields
    isOtpVerified?: boolean;
    otpCode?: string | null;
    otpExpiresAt?: string | null;

    // ✅ Face verification
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

    // ✅ NEW: Additional ID fields
    personalIdNumber?: string | null;
    idIssueDate?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;

    // ✅ OTP fields
    isOtpVerified?: boolean;
    otpCode?: string | null;
    otpExpiresAt?: string | null;

    // ✅ Face verification
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

    // ✅ NEW: Additional ID fields
    personalIdNumber?: string | null;
    idIssueDate?: string | null;
    verified:boolean;
    nationality: string | null;     // ✅ newly added
    gender: string | null;          // ✅ newly added
    placeOfIssue: string | null;    // ✅ newly added
    rawText: string | null;    
  }
}
