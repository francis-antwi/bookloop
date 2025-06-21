import prisma from "@/app/libs/prismadb"
import getCurrentUser from "./getCurrentUser"

export default async function getFavouriteListings() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return [];
        }
        const favourites = await prisma.listing.findMany({
            where: {
                id: {
                    in: [...(currentUser.favouriteIds || [])]
                }
            }
        });
        const safeFavourites = favourites.map((favourite) => ({
            ...favourite,
            createdAt: favourite.createdAt.toISOString()
        }));
        return safeFavourites;

    } catch (error: Error) { // Specify the error type here
        throw new Error(error.message); // Use `error.message` to access the error's message
    }
}
