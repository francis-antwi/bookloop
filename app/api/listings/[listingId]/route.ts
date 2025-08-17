import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

interface IParams {
  listingId: string;
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Extract listingId from URL
    const url = new URL(request.url);
    const listingId = url.pathname.split('/')[4]; // Assuming the route is structured as /api/favourites/[listingId]

    if (!listingId) {
      return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
    }

    const favouriteIds = [...(currentUser.favouriteIds || [])];
    favouriteIds.push(listingId);

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: { favouriteIds },
    });

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/favourites:", error); // Detailed error logging
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    // Adjusted to handle the correct URL structure
    const listingId = url.pathname.split('/')[3]; // Adjust to correct index if needed

    if (!listingId) {
      return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
    }

    // Find the listing to check if it exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Ensure the current user owns the listing if deleting
    if (listing.userId !== currentUser.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this listing' }, { status: 403 });
    }

    // Remove the listing from the user's favouriteIds
    let favouriteIds = [...(currentUser.favouriteIds || [])];
    favouriteIds = favouriteIds.filter(id => id !== listingId);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { favouriteIds },
    });

    // Delete the listing from the database
    await prisma.listing.delete({
      where: { id: listingId },
    });

    return NextResponse.json({ message: 'Listing deleted and favorites updated successfully' }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/listings:", error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

