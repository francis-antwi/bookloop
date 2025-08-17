import prisma from "@/app/libs/prismadb";

interface IParams {
  listingId?: string;
}

interface UserSafe {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: string | null;
  contactPhone?: string | null;
  image?: string | null;
  role: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ListingSafe {
  id: string;
  title: string;
  description: string;
  imageSrc: string[];
  createdAt: string | null;
  category: string;
  price: number;
  email?: string | null;
  contactPhone?: string | null;
  address?: string | null;

  bedrooms?: number | null;
  bathrooms?: number | null;
  furnished?: boolean;
  floor?: number | null;

  make?: string | null;
  model?: string | null;
  year?: number | null;
  seats?: number | null;
  fuelType?: string | null;

  capacity?: number | null;
  rooms?: number | null;
  hasStage?: boolean;
  parkingAvailable?: boolean;

  cuisineType?: string | null;
  seatingCapacity?: number | null;
  openingHours?: string | null;
  deliveryAvailable?: boolean;
  menuHighlights?: string | null;

  serviceType?: string | null;
  availableDates?: string | null;
  duration?: number | null;
  requiresBooking?: boolean;
  serviceProvider?: string | null;

  user: UserSafe | null;
}

export default async function getListingById(params: IParams): Promise<ListingSafe | null> {
  try {
    const { listingId } = params;

    if (!listingId) {
      throw new Error("Listing ID is required");
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { user: true },
    });

    if (!listing) {
      return null;
    }

    const toISOStringSafe = (date?: Date | null) => date?.toISOString?.() ?? null;

    return {
      ...listing,
      createdAt: toISOStringSafe(listing.createdAt),

      user: listing.user
        ? {
            ...listing.user,
            createdAt: toISOStringSafe(listing.user.createdAt),
            updatedAt: toISOStringSafe(listing.user.updatedAt),
            emailVerified: toISOStringSafe(listing.user.emailVerified),
          }
        : null,
    };
  } catch (error: any) {
    console.error("Error in getListingById:", error?.message || error);
    throw new Error(`Failed to fetch the listing: ${error?.message || "Unknown error"}`);
  }
}
