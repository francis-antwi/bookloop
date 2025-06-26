import {
  Listing,
  Reservation,
  User,
  ListingStatus,
  ReservationStatus,
  UserRole,
} from "@prisma/client";

/**
 * SafeUser - A type-safe user object that formats Date objects as strings
 * and ensures role is present.
 */
export type SafeUser = Omit<
  User,
  "createdAt" | "updatedAt" | "emailVerified"
> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  role: UserRole;

  // ✅ Face Verification Fields
  selfieImage: string | null;
  idImage: string | null;
  faceConfidence: number | null;
  isFaceVerified: boolean;
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
