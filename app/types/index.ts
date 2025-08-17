import {
  Listing,
  Reservation,
  User,
  ListingStatus,
  ReservationStatus,
  UserRole,
} from "@prisma/client";

export type SafeUser = Omit<
  User,
  "createdAt" | "updatedAt" | "emailVerified" | "otpExpiresAt"
> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;

  // Optional OTP fields
  otpCode?: string | null;
  otpExpiresAt?: string | null;
  isOtpVerified: boolean;

  // User identity fields
  role: UserRole;
  selfieImage: string | null;
  idImage: string | null;
  faceConfidence: number | null;
  isFaceVerified: boolean;

  idName: string | null;
  idNumber: string | null;
  personalIdNumber: string | null;
  idDOB: string | null;
  idExpiryDate: string | null;
  idIssueDate: string | null;
  idIssuer: string | null;
  idType: string | null;
  verified: boolean;
  nationality: string | null;
  gender: string | null;
  placeOfIssue: string | null;
  rawText: string | null;

  // Business verification fields
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

export type SafeListing = Omit<Listing, "createdAt"> & {
  createdAt: string;
  status: ListingStatus;
};

/**
 * SafeReservation - Uses SafeListing to prevent circular types and 
 * ensures reservation fields are serializable.
 */
export type SafeReservation = Omit<
  Reservation,
  "createdAt" | "startDate" | "endDate" | "listing"
> & {
  createdAt: string;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  listing: SafeListing;
  cancellationRisk?: number | null;
};
