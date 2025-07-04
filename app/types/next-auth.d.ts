import NextAuth from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: UserRole;

      isOtpVerified?: boolean;
      otpCode?: string | null;
      otpExpiresAt?: string | null;

      isFaceVerified?: boolean;
      selfieImage?: string | null;
      idImage?: string | null;
      faceConfidence?: number | null;

      idName?: string | null;
      idNumber?: string | null;
      idDOB?: string | null;
      idExpiryDate?: string | null;
      idIssuer?: string | null;

      personalIdNumber?: string | null;
      idIssueDate?: string | null;

      verified?: boolean;
      nationality?: string | null;
      gender?: string | null;
      placeOfIssue?: string | null;
      rawText?: string | null;
    };
  }

  interface User {
    id?: string;
    role?: UserRole;

    isOtpVerified?: boolean;
    otpCode?: string | null;
    otpExpiresAt?: string | null;

    isFaceVerified?: boolean;
    selfieImage?: string | null;
    idImage?: string | null;
    faceConfidence?: number | null;

    idName?: string | null;
    idNumber?: string | null;
    idDOB?: string | null;
    idExpiryDate?: string | null;
    idIssuer?: string | null;

    personalIdNumber?: string | null;
    idIssueDate?: string | null;

    verified?: boolean;
    nationality?: string | null;
    gender?: string | null;
    placeOfIssue?: string | null;
    rawText?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;

    isOtpVerified?: boolean;
    otpCode?: string | null;
    otpExpiresAt?: string | null;

    isFaceVerified?: boolean;
    selfieImage?: string | null;
    idImage?: string | null;
    faceConfidence?: number | null;

    idName?: string | null;
    idNumber?: string | null;
    idDOB?: string | null;
    idExpiryDate?: string | null;
    idIssuer?: string | null;

    personalIdNumber?: string | null;
    idIssueDate?: string | null;

    verified?: boolean;
    nationality?: string | null;
    gender?: string | null;
    placeOfIssue?: string | null;
    rawText?: string | null;
  }
}
