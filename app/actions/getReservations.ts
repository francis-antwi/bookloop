import prisma from '@/app/libs/prismadb';

interface IParams {
    listingId?: string;
    userId?: string;
    authorId?: string;
}

interface IReservation {
    id: string;
    listingId: string;
    userId: string;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    listing: {
        id: string;
        createdAt: Date;
        userId: string;
    };
}

export default async function getReservations(params: IParams): Promise<IReservation[]> {
    const { listingId, userId, authorId } = params;

    // Define a more specific type for the query object
    const query: Record<string, string | object> = {};

    // Check if listingId is provided
    if (listingId) {
        query.listingId = listingId;
    }

    // Check if userId is provided
    if (userId) {
        query.userId = userId;
    }

    // Check if authorId is provided
    if (authorId) {
        query.listing = { userId: authorId };
    }

    try {
        const reservations = await prisma.reservation.findMany({
            where: query,
            include: {
                listing: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Safely convert dates to ISO strings
        const safeReservations = reservations.map((reservation) => ({
            ...reservation,
            createdAt: reservation.createdAt.toISOString(),
            startDate: reservation.startDate.toISOString(),
            endDate: reservation.endDate.toISOString(),
            listing: {
                ...reservation.listing,
                createdAt: reservation.listing.createdAt.toISOString(),
            },
        }));

        return safeReservations;
    } catch (error: Error) { // Specify the error type here
        console.error("Error fetching reservations:", error);
        throw new Error(error.message || "Failed to fetch reservations");
    }
}
