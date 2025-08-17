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

      // Verification
      isOtpVerified?: boolean;
      otpCode?: string | null;
      otpExpiresAt?: string | null;

      isFaceVerified?: boolean;
      selfieImage?: string | null;
      idImage?: string | null;
      faceConfidence?: number | null;

      // ID Details
      idName?: string | null;
      idNumber?: string | null;
      idDOB?: string | null;
      idExpiryDate?: string | null;
      idIssuer?: string | null;
      idIssueDate?: string | null;
      personalIdNumber?: string | null;
      nationality?: string | null;
      gender?: string | null;
      placeOfIssue?: string | null;
      rawText?: string | null;

      // System
      verified?: boolean;

      // Business Verification
      businessVerified?: boolean;
      businessName?: string | null;
      tinNumber?: string | null;
      registrationNumber?: string | null;
      tinCertificateUrl?: string | null;
      incorporationCertUrl?: string | null;
      vatCertificateUrl?: string | null;
      ssnitCertUrl?: string | null;
      businessType?: string | null;
      businessAddress?: string | null;
    };
  }

  interface User {
    id?: string;
    role?: UserRole;

    // Personal Verification
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
    idIssueDate?: string | null;
    personalIdNumber?: string | null;
    nationality?: string | null;
    gender?: string | null;
    placeOfIssue?: string | null;
    rawText?: string | null;

    verified?: boolean;

    // Business Verification
    businessVerified?: boolean;
    businessName?: string | null;
    tinNumber?: string | null;
    registrationNumber?: string | null;
    tinCertificateUrl?: string | null;
    incorporationCertUrl?: string | null;
    vatCertificateUrl?: string | null;
    ssnitCertUrl?: string | null;
    businessType?: string | null;
    businessAddress?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;

    // Personal Verification
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
    idIssueDate?: string | null;
    personalIdNumber?: string | null;
    nationality?: string | null;
    gender?: string | null;
    placeOfIssue?: string | null;
    rawText?: string | null;

    verified?: boolean;

    // Business Verification
    businessVerified?: boolean;
    businessName?: string | null;
    tinNumber?: string | null;
    registrationNumber?: string | null;
    tinCertificateUrl?: string | null;
    incorporationCertUrl?: string | null;
    vatCertificateUrl?: string | null;
    ssnitCertUrl?: string | null;
    businessType?: string | null;
    businessAddress?: string | null;
  }
}
