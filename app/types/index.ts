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

  role: UserRole;
  selfieImage: string | null;
  idImage: string | null;
  faceConfidence: number | null;
  isFaceVerified: boolean;
  idName: string | null;
  idNumber: string | null;
  idDOB: string | null;
  idExpiryDate: string | null;
  idIssuer: string | null;
  personalIdNumber: string | null;
  idIssueDate: string | null;
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
};
