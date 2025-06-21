import prisma from "@/app/libs/prismadb";

interface IParams {
    listingId?: string;
}

export default async function getListingById(params: IParams) {
    try {
        const { listingId } = params;

        console.log("Received listingId:", listingId); // Log the listingId for debugging

        if (!listingId) {
            throw new Error("Listing ID is required");
        }

        const listing = await prisma.listing.findUnique({
            where: {
                id: listingId
            },
            include: {
                user: true
            }
        });

        if (!listing) {
            console.log("Listing not found for ID:", listingId); // Log if listing is not found
            return null;
        }

        console.log("Listing found:", listing); // Log the fetched listing data

        return {
            ...listing,
            createdAt: listing.user.createdAt ? listing.user.createdAt.toISOString() : null,
            updatedAt: listing.user.updatedAt ? listing.user.updatedAt.toISOString() : null,
            emailVerified: listing.user.emailVerified?.toISOString() || null,
        };
    } catch (error: any) {
        console.error("Error fetching listing:", error); // Log the error
        throw new Error(error.message || "Failed to fetch listing");
    }
}
