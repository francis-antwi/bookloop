import prisma from "@/app/libs/prismadb";
import { SafeListing } from "@/app/types";

export interface IListingsParams {
  userId?: string;
  category?: string;
}

export default async function getListings(
  params: IListingsParams = {}
): Promise<SafeListing[]> {
  try {
    const { userId, category } = params;
    // Build the query object conditionally
    const query: Record<string, any> = {
      status: "APPROVED", // Only fetch approved listings
    };
    if (userId) query.userId = userId;
    if (category) query.category = category;

    const listings = await prisma.listing.findMany({
      where: query,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map to safe listing shape
    const safeListings: SafeListing[] = listings.map((listing) => ({
      id: listing.id,
      userId: listing.userId,
      category: listing.category,
      address: listing.address,
      title: listing.title,
      description: listing.description,
      imageSrc: listing.imageSrc,
      createdAt: listing.createdAt.toISOString(),
      price: listing.price,
      email: listing.email,
      contactPhone: listing.contactPhone,
      status: listing.status ?? null,
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      furnished: listing.furnished ?? null,
      floor: listing.floor ?? null,
      make: listing.make ?? null,
      model: listing.model ?? null,
      year: listing.year ?? null,
      seats: listing.seats ?? null,
      fuelType: listing.fuelType ?? null,
      capacity: listing.capacity ?? null,
      rooms: listing.rooms ?? null,
      hasStage: listing.hasStage ?? null,
      parkingAvailable: listing.parkingAvailable ?? null,
    }));

    return safeListings;
  } catch (error) {
    console.error("Database fetch error in getListings:", error);
    return [];
  }
}