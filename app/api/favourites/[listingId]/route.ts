/* eslint-disable */

import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { URL } from 'url';

// Helper function to extract `listingId` from the URL
function getListingIdFromUrl(url: string): string | null {
  const parsedUrl = new URL(url);
  const listingId = parsedUrl.pathname.split('/').pop();
  return listingId || null;
}

// POST request handler
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const listingId = getListingIdFromUrl(request.url);
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
    console.error("Error in POST /api/favourites:", error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// DELETE request handler
export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const listingId = getListingIdFromUrl(request.url);
    if (!listingId) {
      return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
    }

    let favouriteIds = [...(currentUser.favouriteIds || [])];
    favouriteIds = favouriteIds.filter(id => id !== listingId);

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: { favouriteIds },
    });

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/favourites:", error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
